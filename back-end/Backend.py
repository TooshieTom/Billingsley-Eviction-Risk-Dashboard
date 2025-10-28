# Need to install:
# pip install psycopg2-binary scikit-learn pandas numpy openpyxl flask-cors python-dotenv

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime, date
import bcrypt
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor

# ML
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score

# -------------------------------------------------
# Setup / DB connection
# -------------------------------------------------
load_dotenv()
app = Flask(__name__)

ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return resp


@app.route("/<path:any_path>", methods=["OPTIONS"])
def preflight(any_path):
    return ("", 204)


conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
)
conn.autocommit = True
cursor = conn.cursor()

# -------------------------------------------------
# Schema (matches your manual load)
# -------------------------------------------------
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

cursor.execute("""
CREATE TABLE IF NOT EXISTS screening (
    appCredID TEXT,
    appCredDate DATE,
    appID TEXT,
    category TEXT,
    city TEXT,
    companyCode TEXT,
    companyName TEXT,
    creditRun BOOLEAN,
    date DATE,
    propertyID TEXT,
    policy TEXT,
    posEmployment TEXT,
    posHousing TEXT,
    propName TEXT,
    reasonOne TEXT,
    reasonTwo TEXT,
    reasonThree TEXT,
    rentOwnHist TEXT,
    origScore TEXT,
    finScore TEXT,
    scoreCat TEXT,
    scoreModel INTEGER,
    marketSource TEXT,
    state TEXT,
    zip TEXT,
    age NUMERIC,
    currEmpMon NUMERIC,
    currEmpYear NUMERIC,
    currResMon NUMERIC,
    currResYear NUMERIC,
    income NUMERIC,
    primIncome NUMERIC,
    addIncome NUMERIC,
    riskScore NUMERIC,
    prevEmpMon NUMERIC,
    prevEmpYear NUMERIC,
    prevResMon NUMERIC,
    prevResYear NUMERIC,
    rent NUMERIC,
    rentIncRatio NUMERIC,
    debtIncRatio NUMERIC,
    debtCredRatio NUMERIC,
    voyAppCode TEXT PRIMARY KEY,
    voyPropName TEXT,
    voyPropCode TEXT,
    hasCPMess TEXT,
    checkMes1 TEXT,
    checkMes2 TEXT,
    hasConsStmt TEXT,
    studDebt TEXT,
    medDebt TEXT,
    totScorDebt NUMERIC,
    totDebt NUMERIC,
    itemRev1 TEXT,
    itemRev2 TEXT,
    itemRev3 TEXT,
    revRepAck TEXT,
    appID2 TEXT,
    appScore TEXT,
    appMonInc TEXT,
    appTotDebt NUMERIC,
    avgRiskScore NUMERIC,
    twnReport TEXT,
    appStatus TEXT
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS meta_updates (
    id SERIAL PRIMARY KEY,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
""")
conn.commit()


# -------------------------------------------------
# Users / Auth
# -------------------------------------------------
def ensure_users_table():
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


ensure_users_table()


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

    cursor.execute(
        "SELECT id, name, email, password_hash, role FROM users WHERE email = %s",
        (email,)
    )
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

    return jsonify({'error': 'Invalid credentials'}), 401


# -------------------------------------------------
# Helpers
# -------------------------------------------------
DATE_COLUMNS = ['dtleasefrom', 'dtleaseto', 'dtmovein', 'dtmoveout', 'dtroomearlyout']


def _normalize_row(row: dict):
    # (used if you later add upload; safe to keep)
    row = {
        str(k).strip().lower():
            (str(v).strip() if (v is not None and str(v).strip() != '') else None)
        for k, v in row.items()
    }
    for col in DATE_COLUMNS:
        if row.get(col):
            try:
                row[col] = datetime.strptime(row[col], "%m/%d/%Y").date()
            except Exception:
                try:
                    if isinstance(row[col], (datetime, date)):
                        row[col] = row[col]
                    else:
                        row[col] = datetime.fromisoformat(str(row[col])).date()
                except Exception:
                    row[col] = None
    return row


def _bucketsql():
    # Which month a row counts toward (for grouping)
    return """date_trunc('month',
              coalesce(dtmovein, dtleasefrom, dtroomearlyout, dtleaseto)
            )::date"""


def _clean_pscode_sql():
    # Strip trailing ".0" from pscode
    return "regexp_replace(pscode, '\\.0+$', '')"


def _build_filter_sql(params, allow_dates=True):
    where = []
    vals = []

    # date window: frontend passes YYYY-MM
    if allow_dates:
        start = params.get("start")
        end = params.get("end")
        if start:
            where.append(f"{_bucketsql()} >= date_trunc('month', %s::date)")
            vals.append(f"{start}-01")
        if end:
            where.append(f"{_bucketsql()} <= (date_trunc('month', %s::date) + interval '1 month - 1 day')::date")
            vals.append(f"{end}-01")

    # multi-pscode
    pscodes = params.getlist("pscode") if hasattr(params, "getlist") else params.get("pscode")
    if pscodes:
        if isinstance(pscodes, str):
            pscodes = [pscodes]
        where.append(f"{_clean_pscode_sql()} = ANY(%s)")
        vals.append(pscodes)

    # screen result
    screen = params.get("screenresult")
    if screen:
        where.append("screenresult = %s")
        vals.append(screen)

    # collections filter
    collections = params.get("collections")
    if collections == "with":
        where.append("coalesce(damoutcollections,0) > 0")
    elif collections == "without":
        where.append("coalesce(damoutcollections,0) = 0")

    # eviction filter
    ev = params.get("evicted")
    if ev in ("Yes", "No"):
        where.append("sevicted = %s")
        vals.append(ev)

    return ("WHERE " + " AND ".join(where)) if where else "", vals


# -------------------------------------------------
# /filters/options
# -------------------------------------------------
@app.route("/filters/options")
def filter_options():
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"""
                SELECT DISTINCT {_clean_pscode_sql()} AS pcode_clean
                FROM transacts
                WHERE pscode IS NOT NULL
                ORDER BY pcode_clean
            """)
            props = [r["pcode_clean"] for r in cur.fetchall()]

            cur.execute("""
                SELECT DISTINCT screenresult
                FROM transacts
                WHERE screenresult IS NOT NULL
                ORDER BY screenresult
            """)
            screens = [r["screenresult"] for r in cur.fetchall()]

        return jsonify({"pscodes": props, "screenresults": screens})
    except Exception as e:
        print(f"Error in filter_options: {str(e)}")
        return jsonify({"pscodes": [], "screenresults": []}), 200


# -------------------------------------------------
# KPI queries with positive dollar magnitudes
# -------------------------------------------------
def _query_snapshot(where_clause, vals):
    q = f"""
        WITH base AS (
            SELECT {_bucketsql()} AS month_key,
                   dnumlate,
                   dnumnsf,
                   damoutcollections,
                   drentwrittenoff,
                   dnonrentwrittenoff
            FROM transacts
            {where_clause}
        )
        SELECT
          COUNT(*) AS total_rows,
          COALESCE(SUM(CASE WHEN dnumlate > 0 THEN 1 ELSE 0 END),0)::float
            / NULLIF(COUNT(*),0) AS pct_late_payers,
          COALESCE(SUM(dnumnsf),0) AS nsf_count,
          ABS(COALESCE(SUM(damoutcollections),0)) AS collections_exposure,
          ABS(COALESCE(SUM(drentwrittenoff) + SUM(dnonrentwrittenoff), 0)) AS dollars_delinquent
        FROM base;
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(q, vals)
        row = cur.fetchone()
    return row


def _query_timeseries(where_clause, vals):
    q = f"""
        WITH base AS (
            SELECT {_bucketsql()} AS month_key,
                   dnumlate,
                   dnumnsf,
                   damoutcollections,
                   drentwrittenoff,
                   dnonrentwrittenoff
            FROM transacts
            {where_clause}
        )
        SELECT
          month_key,
          COALESCE(SUM(CASE WHEN dnumlate > 0 THEN 1 ELSE 0 END),0)::float
            / NULLIF(COUNT(*),0) AS pct_late_payers,
          COALESCE(SUM(dnumnsf),0) AS nsf_count,
          ABS(COALESCE(SUM(damoutcollections),0)) AS collections_exposure,
          ABS(COALESCE(SUM(drentwrittenoff) + SUM(dnonrentwrittenoff), 0)) AS dollars_delinquent
        FROM base
        GROUP BY month_key
        ORDER BY month_key;
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(q, vals)
        return cur.fetchall()


# -------------------------------------------------
# /kpis/snapshot
# -------------------------------------------------
@app.route("/kpis/snapshot")
def kpi_snapshot():
    try:
        where1, vals1 = _build_filter_sql(request.args, allow_dates=True)
        row = _query_snapshot(where1, vals1)

        if not row or (row["total_rows"] or 0) == 0:
            where2, vals2 = _build_filter_sql(request.args, allow_dates=False)
            row = _query_snapshot(where2, vals2)

        if not row or (row["total_rows"] or 0) == 0:
            return jsonify({
                "pct_late_payers": 0.0,
                "nsf_count": 0,
                "collections_exposure": 0.0,
                "dollars_delinquent": 0.0
            })

        return jsonify({
            "pct_late_payers": float(row["pct_late_payers"] or 0.0),
            "nsf_count": int(row["nsf_count"] or 0),
            "collections_exposure": float(row["collections_exposure"] or 0.0),
            "dollars_delinquent": float(row["dollars_delinquent"] or 0.0)
        })
    except Exception as e:
        print(f"Error in kpi_snapshot: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "pct_late_payers": 0.0,
            "nsf_count": 0,
            "collections_exposure": 0.0,
            "dollars_delinquent": 0.0
        }), 200


# -------------------------------------------------
# /kpis/timeseries
# -------------------------------------------------
@app.route("/kpis/timeseries")
def kpi_timeseries():
    try:
        where1, vals1 = _build_filter_sql(request.args, allow_dates=True)
        rows = _query_timeseries(where1, vals1)

        if len(rows) == 0:
            where2, vals2 = _build_filter_sql(request.args, allow_dates=False)
            rows = _query_timeseries(where2, vals2)

        out = []
        for r in rows:
            mk = r["month_key"]
            out.append({
                "month": mk.strftime("%Y/%m") if mk else None,
                "pct_late_payers": float(r["pct_late_payers"] or 0.0),
                "nsf_count": int(r["nsf_count"] or 0),
                "collections_exposure": float(r["collections_exposure"] or 0.0),
                "dollars_delinquent": float(r["dollars_delinquent"] or 0.0),
            })
        return jsonify(out)
    except Exception as e:
        print(f"Error in kpi_timeseries: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 200


# -------------------------------------------------
# Feature importance with proper missing value handling
# -------------------------------------------------
_PREDICTOR_COLS = [
    "dnumnsf", "dnumlate", "davgdayslate", "srent", "dincome",
    "daypaid", "dpaysourcechange",
    "screenresult", "screenvendor", "sflex", "sleap", "spaymentsource", "sprevzip"
]

_HUMAN_NAME = {
    "dnumnsf": "NSF count",
    "dnumlate": "Late payment count",
    "davgdayslate": "Average days late",
    "srent": "Monthly rent",
    "dincome": "Reported income",
    "daypaid": "Day-of-month paid",
    "dpaysourcechange": "Payment source changed",
    "screenresult": "Screen result",
    "screenvendor": "Screen vendor",
    "sflex": "Flex program",
    "sleap": "LEAP program",
    "spaymentsource": "Payment source",
    "sprevzip": "Previous ZIP code",
}


def _humanize_feature_name(raw: str) -> str:
    if "_" in raw:
        prefix, val = raw.split("_", 1)
        if prefix in _HUMAN_NAME:
            return f"{_HUMAN_NAME[prefix]}: {val.replace('_', ' ')}"
    return _HUMAN_NAME.get(raw, raw)


def _train_rf_with_imputation(X: pd.DataFrame, y: pd.Series):
    """
    Train Random Forest with proper missing value handling via imputation.
    Returns (pipeline, auc_score, feature_names) or (None, None, None) on failure.
    """
    try:
        # Identify numeric and categorical columns that exist in X
        num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = [c for c in X.columns if c not in num_cols]

        # Build preprocessing pipeline with imputation
        transformers = []

        if num_cols:
            num_pipeline = Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
            ])
            transformers.append(('num', num_pipeline, num_cols))

        if cat_cols:
            cat_pipeline = Pipeline([
                ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
                ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
            ])
            transformers.append(('cat', cat_pipeline, cat_cols))

        if not transformers:
            return None, None, None

        preprocessor = ColumnTransformer(
            transformers=transformers,
            remainder='drop'
        )

        # Split data
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.25, random_state=42, stratify=y
            )
        except ValueError:
            # If stratification fails, try without stratify
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.25, random_state=42
            )

        # Use single simplified config for speed
        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_leaf=5,
            max_features='sqrt',
            n_jobs=-1,
            random_state=42,
            class_weight='balanced'
        )

        pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', rf)
        ])

        pipeline.fit(X_train, y_train)

        # Evaluate
        y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, y_pred_proba)

        # Extract feature names
        feature_names = []
        if num_cols:
            feature_names.extend(num_cols)
        if cat_cols:
            cat_feature_names = (
                pipeline.named_steps['preprocessor']
                .named_transformers_['cat']
                .named_steps['encoder']
                .get_feature_names_out(cat_cols)
            )
            feature_names.extend(cat_feature_names)

        return pipeline, auc, feature_names

    except Exception as e:
        print(f"RF training error: {str(e)}")
        return None, None, None


@app.route("/features/importance", methods=["GET", "OPTIONS"])
def feature_importance():
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        # Query data
        q = """
            SELECT
              sevicted,
              dnumnsf, dnumlate, davgdayslate, srent, dincome,
              daypaid, dpaysourcechange,
              screenresult, screenvendor, sflex, sleap, spaymentsource, sprevzip
            FROM transacts
            WHERE sevicted IS NOT NULL
        """
        df = pd.read_sql(q, conn)

        # Quick validation checks
        if df.empty or len(df) < 50:
            return jsonify({
                "auc": None,
                "top_features": []
            }), 200

        # Check if we have both classes
        evicted_counts = df["sevicted"].astype(str).str.upper().value_counts()
        if len(evicted_counts) < 2:
            return jsonify({
                "auc": None,
                "top_features": []
            }), 200

        # Prepare target variable
        y = (df["sevicted"].astype(str).str.upper() == "YES").astype(int)

        # Prepare features
        X = df.drop(columns=["sevicted"])
        X = X[[c for c in _PREDICTOR_COLS if c in X.columns]]

        # Remove columns with all missing values
        X = X.dropna(axis=1, how='all')

        if X.empty or len(X.columns) == 0:
            return jsonify({
                "auc": None,
                "top_features": []
            }), 200

        # Train model with imputation
        pipeline, auc, feature_names = _train_rf_with_imputation(X, y)

        if pipeline is None or feature_names is None:
            return jsonify({
                "auc": None,
                "top_features": []
            }), 200

        # Extract feature importances
        feature_importances = pipeline.named_steps['classifier'].feature_importances_

        # Pair features with importances and sort
        feature_importance_pairs = list(zip(feature_names, feature_importances))
        feature_importance_pairs.sort(key=lambda x: x[1], reverse=True)

        # Format top features
        top_features = [
            {
                "feature": _humanize_feature_name(name),
                "importance": float(importance)
            }
            for name, importance in feature_importance_pairs[:20]
        ]

        return jsonify({
            "auc": float(auc),
            "top_features": top_features
        }), 200

    except Exception as e:
        print(f"Feature importance error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty result instead of error to not block page load
        return jsonify({
            "auc": None,
            "top_features": []
        }), 200


# -------------------------------------------------
# Health
# -------------------------------------------------
@app.route("/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(port=5000, debug=True)