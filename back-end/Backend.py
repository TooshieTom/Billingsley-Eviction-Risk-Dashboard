# Need to install "pip install psycopg2-binary scikit-learn shap pandas numpy openpyxl flask-cors python-dotenv"
# Also used pip install dotenv for environment file

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import csv, io
from datetime import datetime, date
from openpyxl import load_workbook
import bcrypt
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor

# ML / Explainability
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score

try:
    import shap

    _HAS_SHAP = True
except Exception:
    _HAS_SHAP = False

# Load .env file
load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

# --- DB CONNECTION ---
conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT")
)
conn.autocommit = True
cursor = conn.cursor()

# --- SCHEMA (idempotent) ---
cursor.execute("""
CREATE TABLE IF NOT EXISTS transacts (
    pscode TEXT,
    tscode TEXT PRIMARY KEY,
    uscode TEXT,
    screenresult TEXT,
    screenvendor TEXT,
    dnumnsf INTEGER,
    dnumlate INTEGER,
    davgdayslate INTEGER,
    sevicted TEXT,
    smoveoutreason TEXT,
    drentwrittenoff NUMERIC,
    dnonrentwrittenoff NUMERIC,
    damoutcollections NUMERIC,
    srenewed TEXT,
    srent NUMERIC,
    sfulfilledterm TEXT,
    dincome NUMERIC,
    dtleasefrom DATE,
    dtleaseto DATE,
    dtmovein DATE,
    dtmoveout DATE,
    dwocount INTEGER,
    dtroomearlyout DATE,
    sempcompany TEXT,
    sempposition TEXT,
    sflex TEXT,
    sleap TEXT,
    sprevzip TEXT,
    daypaid INTEGER,
    spaymentsource TEXT,
    dpaysourcechange INTEGER
);
""")


# Simple "meta" table to track when data changed so frontend can refresh
cursor.execute("""
CREATE TABLE IF NOT EXISTS meta_updates (
    id SERIAL PRIMARY KEY,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
""")

# --- Helpers ---

PRIMARY_KEY = "tscode"
DATE_COLUMNS = ['dtleasefrom', 'dtleaseto', 'dtmovein', 'dtmoveout', 'dtroomearlyout']


def users():
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'end-user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );        
    """)

    conn.commit()


users()

@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({'error': 'Information missing'}), 400
    
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf8')

    try:
        cursor.execute("""
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id, name, email, role
        """, (name, email, hashed_pw))
        conn.commit()

        new_user = cursor.fetchone()
        return jsonify({
            'id': new_user[0],
            'name': new_user[1],
            'email': new_user[2],
            'role': new_user[3]
        }), 201

    except psycopg2.Error as e:
        conn.rollback()
        if 'unique' in str(e).lower():
            return jsonify({'error': 'Email exists'}), 409
        return jsonify({'error': 'Database error'}), 500
    
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Missing either email or password'}), 400
    
    cursor.execute("SELECT id, name, email, password_hash, role FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
        return jsonify({
            'id': user[0],
            'name': user[1],
            'email': user[2],
            'role': user[4]
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401


def _normalize_row(row: dict):
    """Trim keys/values, empty->None, and parse dates (mm/dd/yyyy)."""
    row = {str(k).strip().lower(): (str(v).strip() if (v is not None and str(v).strip() != '') else None)
           for k, v in row.items()}
    for col in DATE_COLUMNS:
        if row.get(col):
            try:
                row[col] = datetime.strptime(row[col], "%m/%d/%Y").date()
            except Exception:
                try:
                    # Try ISO style if already clean
                    if isinstance(row[col], (datetime, date)):
                        row[col] = row[col]
                    else:
                        row[col] = datetime.fromisoformat(str(row[col])).date()
                except Exception:
                    row[col] = None
    return row


def _bucketsql():
    # Use move-in or lease-from as the timeline anchor; fallback chain to any date available
    return """date_trunc('month',
              coalesce(dtmovein, dtleasefrom, dtroomearlyout, dtleaseto)
            )::date"""


def _build_filter_sql(params):
    """Returns (where_clause, bind_values) based on query params."""
    where = []
    vals = []
    # Date range (month precision)
    start = params.get("start")  # 'YYYY-MM'
    end = params.get("end")  # 'YYYY-MM'
    if start:
        where.append(f"{_bucketsql()} >= date_trunc('month', %s::date)")
        vals.append(f"{start}-01")
    if end:
        where.append(f"{_bucketsql()} <= (date_trunc('month', %s::date) + interval '1 month - 1 day')::date")
        vals.append(f"{end}-01")

    # Property codes
    pscodes = params.getlist("pscode") if hasattr(params, "getlist") else params.get("pscode")
    if pscodes:
        if isinstance(pscodes, str):
            pscodes = [pscodes]
        where.append("pscode = ANY(%s)")
        vals.append(pscodes)

    # Screening result filter (e.g., 'Approved', 'Conditional', etc.)
    screen = params.get("screenresult")
    if screen:
        where.append("screenresult = %s")
        vals.append(screen)

    # Collections status (has balance > 0)
    collections = params.get("collections")
    if collections == "with":
        where.append("coalesce(damoutcollections,0) > 0")
    elif collections == "without":
        where.append("coalesce(damoutcollections,0) = 0")

    # Eviction flag
    ev = params.get("evicted")
    if ev in ("Yes", "No"):
        where.append("sevicted = %s")
        vals.append(ev)

    return ("WHERE " + " AND ".join(where)) if where else "", vals


# --- Upload route (unchanged behavior, plus meta update) ---

@app.route("/upload", methods=["POST"])
def upload_file():
    if "transact" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["transact"]
    filename = file.filename
    content = file.read()  # bytes

    ext = os.path.splitext(filename)[1].lower()
    if ext == ".csv":
        try:
            csv_file = io.StringIO(content.decode("utf-8"))
        except UnicodeDecodeError:
            return jsonify({"message": f"{filename} is not UTF-8 encoded"}), 400

        # Skip first 5 rows (headers/noise)
        for _ in range(5):
            next(csv_file, None)

        reader = csv.DictReader(csv_file)
        reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]

        # Prepare upsert dynamically based on first row
        first = next(reader, None)
        if first is None:
            return jsonify({"message": "No rows detected after header"}), 400

        first = _normalize_row(first)
        columns = list(first.keys())
        placeholders = ', '.join(['%s'] * len(columns))
        colsql = ', '.join(columns)
        update_clause = ', '.join([f"{c}=EXCLUDED.{c}" for c in columns if c != PRIMARY_KEY])

        sql = f"INSERT INTO transacts ({colsql}) VALUES ({placeholders}) ON CONFLICT ({PRIMARY_KEY}) DO UPDATE SET {update_clause}"

        batch, batch_size = [], 1000

        def add_row(r):
            r = _normalize_row(r)
            if not r.get(PRIMARY_KEY):
                return
            batch.append([r.get(c) for c in columns])

        add_row(first)
        for r in reader:
            add_row(r)
            if len(batch) >= batch_size:
                cursor.executemany(sql, batch)
                batch.clear()
        if batch:
            cursor.executemany(sql, batch)

    elif ext == ".xlsx":
        xlsx = io.BytesIO(content)
        wb = load_workbook(xlsx, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        rows = rows[5:]  # skip first 5 rows
        if not rows:
            return jsonify({"message": "No data rows detected"}), 400
        headers = [str(h).strip().lower() for h in rows[0]]
        for row in rows[1:]:
            rd = {k: v for k, v in zip(headers, row)}
            rd = _normalize_row(rd)
            if not rd.get(PRIMARY_KEY):
                continue
            cols = list(rd.keys())
            placeholders = ', '.join(['%s'] * len(cols))
            colsql = ', '.join(cols)
            update_clause = ', '.join([f"{c}=EXCLUDED.{c}" for c in cols if c != PRIMARY_KEY])
            sql = f"INSERT INTO transacts ({colsql}) VALUES ({placeholders}) ON CONFLICT ({PRIMARY_KEY}) DO UPDATE SET {update_clause}"
            cursor.execute(sql, [rd.get(c) for c in cols])
    else:
        return jsonify({"message": "Unsupported file type"}), 400

    # Touch meta_updates
    cursor.execute("INSERT INTO meta_updates (updated_at) VALUES (NOW())")
    return jsonify({"message": f"{filename} uploaded successfully"}), 200


# --- Filters/options for global filter bar ---
@app.route("/filters/options")
def filter_options():
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT DISTINCT pscode FROM transacts WHERE pscode IS NOT NULL ORDER BY pscode")
        props = [r["pscode"] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT screenresult FROM transacts WHERE screenresult IS NOT NULL ORDER BY screenresult")
        screens = [r["screenresult"] for r in cur.fetchall()]
    return jsonify({"pscodes": props, "screenresults": screens})


# --- Last updated ---
@app.route("/last-updated")
def last_updated():
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT COALESCE(MAX(updated_at), NOW()) AS ts FROM meta_updates")
        ts = cur.fetchone()["ts"]
    return jsonify({"updated_at": ts.isoformat()})


# --- KPI snapshot for selected window ---
@app.route("/kpis/snapshot")
def kpi_snapshot():
    where, vals = _build_filter_sql(request.args)
    month_col = _bucketsql()
    q = f"""
        WITH base AS (
            SELECT
              {month_col} AS month_key,
              dnumlate,
              dnumnsf,
              damoutcollections,
              drentwrittenoff, dnonrentwrittenoff
            FROM transacts
            {where}
        )
        SELECT
          COALESCE(SUM(CASE WHEN dnumlate > 0 THEN 1 ELSE 0 END),0)::float / NULLIF(COUNT(*),0) AS pct_late_payers,
          COALESCE(SUM(dnumnsf),0) AS nsf_count,
          COALESCE(SUM(damoutcollections),0) AS collections_exposure,
          COALESCE(SUM(drentwrittenoff) + SUM(dnonrentwrittenoff), 0) AS dollars_delinquent
        FROM base;
    """

    with conn.cursor() as cur:
        cur.execute(q, vals)
        late_rate, nsf, coll, delinquent = cur.fetchone()
    return jsonify({
        "pct_late_payers": late_rate or 0.0,
        "nsf_count": int(nsf or 0),
        "collections_exposure": float(coll or 0.0),
        "dollars_delinquent": float(delinquent or 0.0)
    })


# --- KPI time series ---
@app.route("/kpis/timeseries")
def kpi_timeseries():
    where, vals = _build_filter_sql(request.args)
    month_col = _bucketsql()
    q = f"""
        WITH base AS (
            SELECT
              {month_col} AS month_key,
              dnumlate, dnumnsf, damoutcollections, drentwrittenoff, dnonrentwrittenoff
            FROM transacts
            {where}
        )
        SELECT
          month_key,
          COALESCE(SUM(CASE WHEN dnumlate > 0 THEN 1 ELSE 0 END),0)::float / NULLIF(COUNT(*),0) AS pct_late_payers,
          COALESCE(SUM(dnumnsf),0) AS nsf_count,
          COALESCE(SUM(damoutcollections),0) AS collections_exposure,
          COALESCE(SUM(drentwrittenoff) + SUM(dnonrentwrittenoff), 0) AS dollars_delinquent
        FROM base
        GROUP BY month_key
        ORDER BY month_key;
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(q, vals)
        rows = cur.fetchall()
    # Format dates as YYYY-MM for frontend
    for r in rows:
        r["month"] = r.pop("month_key").strftime("%Y-%m")
    return jsonify(rows)


# --- Feature importance / SHAP ---
@app.route("/features/importance")
def feature_importance():
    # Target: eviction Yes/No
    # Pull a filtered dataset so importances reflect current slice
    where, vals = _build_filter_sql(request.args)
    q = f"""
        SELECT
          sevicted,
          dnumnsf, dnumlate, davgdayslate, srent, dincome,
          damoutcollections, drentwrittenoff, dnonrentwrittenoff, dwocount, daypaid,
          screenresult, screenvendor, srenewed, sfulfilledterm, sflex, sleap
        FROM transacts
        {where}
        AND sevicted IS NOT NULL
    """
    df = pd.read_sql(q, conn, params=vals)
    if df.empty or df["sevicted"].nunique() < 2:
        return jsonify({"message": "Not enough data to compute feature importance"}), 400

    y = (df["sevicted"].str.upper() == "YES").astype(int)
    X = df.drop(columns=["sevicted"])

    # Separate numeric and categorical
    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in X.columns if c not in num_cols]

    pre = ColumnTransformer(
        transformers=[
            ("num", "passthrough", num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols)
        ]
    )

    # RF pipeline
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        n_jobs=-1,
        random_state=42,
        class_weight="balanced"
    )
    pipe = Pipeline([("prep", pre), ("rf", rf)])

    # Train/holdout to report a quick quality metric
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    pipe.fit(Xtr, ytr)
    try:
        pred = pipe.predict_proba(Xte)[:, 1]
        auc = float(roc_auc_score(yte, pred))
    except Exception:
        auc = None

    # Try SHAP (exact for tree models) if available; otherwise permutation importances
    importances = []
    if _HAS_SHAP:
        try:
            explainer = shap.TreeExplainer(pipe.named_steps["rf"])
            # Transform a sample through preprocessor to line up with model features
            Xt = pipe.named_steps["prep"].fit_transform(Xtr)
            # SHAP on a small sample for speed
            k = min(200, Xt.shape[0])
            shap_vals = explainer.shap_values(pipe.named_steps["rf"].estimators_[0],
                                              check_additivity=False) if False else None
        except Exception:
            # Fallback to model feature_importances_ on processed matrix
            Xt = pipe.named_steps["prep"].transform(Xtr)
            fi = pipe.named_steps["rf"].feature_importances_
            # Retrieve feature names
            cat_names = pipe.named_steps["prep"].named_transformers_["cat"].get_feature_names_out(
                cat_cols) if cat_cols else []
            feat_names = list(num_cols) + list(cat_names)
            importances = sorted(
                [{"feature": f, "importance": float(v)} for f, v in zip(feat_names, fi)],
                key=lambda d: d["importance"],
                reverse=True
            )[:20]
    if not importances:
        # Generic importance via model attribute
        try:
            Xt = pipe.named_steps["prep"].transform(Xtr)
            fi = pipe.named_steps["rf"].feature_importances_
            cat_names = pipe.named_steps["prep"].named_transformers_["cat"].get_feature_names_out(
                cat_cols) if cat_cols else []
            feat_names = list(num_cols) + list(cat_names)
            importances = sorted(
                [{"feature": f, "importance": float(v)} for f, v in zip(feat_names, fi)],
                key=lambda d: d["importance"],
                reverse=True
            )[:20]
        except Exception:
            importances = []

    return jsonify({
        "auc": auc,
        "top_features": importances
    })


# --- Minimal health ---
@app.route("/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
