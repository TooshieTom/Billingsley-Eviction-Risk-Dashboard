import { useEffect, useMemo, useRef, useState } from "react";
import { Header, UserNavigation } from "./DashboardComponents";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function yyyymmToParts(ym) {
  if (!ym) return null;
  const [y, m] = ym.split("-");
  return { y: parseInt(y, 10), mIdx: parseInt(m, 10) - 1 };
}

function prettyMonthYear(ym) {
  if (!ym) return "";
  const parts = yyyymmToParts(ym);
  if (!parts) return "";
  return `${monthNames[parts.mIdx]} ${parts.y}`;
}

function dateObjToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO() {
  const d = new Date();
  return dateObjToISO(d);
}

/* ============================================================
   CLONE NODE + INLINE STYLES (for PNG export)
   ============================================================ */
function cloneWithComputedStyles(sourceNode) {
  const clone = sourceNode.cloneNode(true);

  function applyAllStyles(srcEl, dstEl) {
    const computed = window.getComputedStyle(srcEl);

    for (let i = 0; i < computed.length; i++) {
      const propName = computed[i];
      const val = computed.getPropertyValue(propName);
      if (!val) continue;
      if (typeof val === "string" && val.includes("oklch")) continue;
      dstEl.style.setProperty(propName, val, "important");
    }

    const srcKids = srcEl.children;
    const dstKids = dstEl.children;
    for (let j = 0; j < srcKids.length; j++) {
      applyAllStyles(srcKids[j], dstKids[j]);
    }
  }

  applyAllStyles(sourceNode, clone);
  return clone;
}

/* =========================
   SMALL HOOK: DEBOUNCE A VALUE
   ========================= */
function useDebounced(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/* =========================
   INLINE DATE INPUT
   ========================= */
function DateDropdown({ label, valueISO, onChangeISO }) {
  return (
    <div className="flex flex-col">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <input
        type="date"
        className="min-w-[11rem] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        value={valueISO}
        onChange={(e) => {
          onChangeISO(e.target.value);
        }}
      />
    </div>
  );
}

/* =========================
   PROPERTY MULTISELECT
   ========================= */
function PropertyMultiSelect({
  options,
  selected,
  setSelected,
  dropdownId,
  openDropdown,
  setOpenDropdown,
}) {
  const wrapperRef = useRef(null);
  const isOpen = openDropdown === dropdownId;

  const allSelected =
    selected.length === options.length && options.length > 0;

  function toggleOne(code) {
    if (selected.includes(code)) {
      setSelected(selected.filter((c) => c !== code));
    } else {
      setSelected([...selected, code]);
    }
  }

  function selectAll() {
    setSelected(options.slice());
  }

  function clearAll() {
    setSelected([]);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        if (openDropdown === dropdownId) {
          setOpenDropdown(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown, dropdownId, setOpenDropdown]);

  let summary = "Properties";
  if (selected.length === 1) summary = selected[0];
  else if (allSelected) summary = "All";
  else if (selected.length > 1) summary = `${selected.length} selected`;

  return (
    <div className="flex flex-col relative" ref={wrapperRef}>
      <div className="text-xs text-zinc-500 mb-1">Properties</div>

      <button
        className="min-w-[10rem] flex items-center justify-between rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50"
        onClick={() => {
          setOpenDropdown(isOpen ? null : dropdownId);
        }}
        type="button"
      >
        <span className="truncate max-w-[8rem]">{summary}</span>
        <span className="text-zinc-400 text-xs">▾</span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 max-h-60 w-48 overflow-y-auto rounded-xl border border-zinc-300 bg-white text-sm shadow-xl p-1 space-y-1
                     left-1/2 -translate-x-1/2 transform"
        >
          <div className="flex gap-2 justify-center text-center">
            <button
              className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
              onClick={selectAll}
              type="button"
            >
              Select all
            </button>
            <button
              className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
              onClick={clearAll}
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="border-t border-zinc-200" />

          <div className="max-h-40 overflow-y-auto space-y-[2px] pr-1 flex flex-col items-center">
            {options.map((code) => (
              <label
                key={code}
                className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-zinc-100 rounded-lg px-1 py-[1px] w-full justify-center"
              >
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={selected.includes(code)}
                  onChange={() => toggleOne(code)}
                />
                <span className="truncate">{code}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   MAIN SHELL (header/nav chrome)
   ========================= */
export default function UserView({ user, onSwapView, onLogout }) {
  const [activeView, setActiveView] = useState("portfolio");
  return (
    <div className="fixed w-screen h-screen bg-zinc-600 flex flex-col">
      <div className="w-full">
        <Header user={user} onSwapView={onSwapView} onLogout={onLogout} />
      </div>

      <div className="flex-grow flex justify-center items-center p-8 min-h-0">
        <div className="w-[98%] h-full bg-white rounded-2xl flex flex-col shadow-xl">
          <div className="flex-grow flex justify-center items-stretch overflow-hidden p-6">
            {activeView === "portfolio" && <PortfolioView />}
            {activeView === "property" && <PropertyView />}
            {activeView === "at-risk" && <AtRiskView />}
          </div>
          <div className="w-full">
            <UserNavigation
              activeView={activeView}
              setActiveView={setActiveView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   FILTER STATE HOOK
   ========================= */
function useFilters() {
  const [options, setOptions] = useState({ pscodes: [], screenresults: [] });

  const [pscodes, setPscodes] = useState([]);
  const [screenresult, setScreenresult] = useState(null);
  const [collections, setCollections] = useState("any");
  const [evicted, setEvicted] = useState("any");

  const [startISO, setStartISO] = useState("2000-01-01");
  const [endISO, setEndISO] = useState(todayISO());

  useEffect(() => {
    fetch("http://127.0.0.1:5000/filters/options")
      .then((r) => r.json())
      .then((data) => {
        const cleaned = Array.isArray(data.pscodes)
          ? data.pscodes.map((p) =>
              typeof p === "string" ? p.replace(/\.0+$/, "") : p
            )
          : [];
        setOptions({
          pscodes: cleaned,
          screenresults: data.screenresults || [],
        });
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  function monthPart(isoDateStr) {
    return isoDateStr?.slice(0, 7) ?? "";
  }

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (startISO) params.set("start", monthPart(startISO));
    if (endISO) params.set("end", monthPart(endISO));
    (pscodes || []).forEach((p) => params.append("pscode", p));
    if (screenresult) params.set("screenresult", screenresult);
    if (collections !== "any") params.set("collections", collections);
    if (evicted !== "any") params.set("evicted", evicted);
    return params.toString();
  }, [startISO, endISO, pscodes, screenresult, collections, evicted]);

  return {
    options,
    startISO,
    endISO,
    pscodes,
    screenresult,
    collections,
    evicted,
    setStartISO,
    setEndISO,
    setPscodes,
    setScreenresult,
    setCollections,
    setEvicted,
    queryString: qs,
  };
}

/* =========================
   PORTFOLIO VIEW
   ========================= */
export function PortfolioView() {
  const filters = useFilters();

  const [snapshot, setSnapshot] = useState(null);
  const [series, setSeries] = useState([]);

  // feature importance now loads separately, once, without blocking filters
  const [topFeatures, setTopFeatures] = useState({
    auc: null,
    top_features: [],
  });

  const [openDropdown, setOpenDropdown] = useState(null);

  // THIS IS NOW THE *INNER* CONTENT WRAPPER (not the scroll container)
  const exportRef = useRef(null);

  // Debounce the query string so rapid filter clicks don't spam fetches
  const debouncedQS = useDebounced(filters.queryString, 300);

  // Fetch KPIs (snapshot + timeseries) whenever debounced filters change
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [snapRes, tsRes] = await Promise.all([
          fetch(`http://127.0.0.1:5000/kpis/snapshot?${debouncedQS}`),
          fetch(`http://127.0.0.1:5000/kpis/timeseries?${debouncedQS}`),
        ]);

        const snapJson = snapRes.ok ? await snapRes.json() : null;
        const tsJson = tsRes.ok ? await tsRes.json() : [];

        if (!alive) return;
        setSnapshot(snapJson);
        setSeries(Array.isArray(tsJson) ? tsJson : []);
      } catch (err) {
        if (!alive) return;
        console.error("Dashboard fetch error:", err);
        setSnapshot(null);
        setSeries([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debouncedQS]);

  // Fetch feature importance JUST ONCE on mount.
  // This still calls the backend route, but it's no longer on every filter change.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const featRes = await fetch("http://127.0.0.1:5000/features/importance", {
          method: "GET",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
        });
        const featJson = featRes.ok
          ? await featRes.json()
          : { auc: null, top_features: [] };

        if (!alive) return;
        setTopFeatures(featJson);
      } catch (err) {
        if (!alive) return;
        console.error("Feature importance fetch error:", err);
        setTopFeatures({ auc: null, top_features: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // formatting helpers
  const num = (n) => (n ?? 0).toLocaleString();
  const pct = (p) => `${Math.round((p ?? 0) * 1000) / 10}%`;

  const tooltipLabelFormatter = (labelVal) => {
    if (!labelVal) return "";
    const parts = String(labelVal).split("/");
    if (parts.length < 2) return labelVal;
    const [yyyy, mm] = parts;
    const mmPadded = mm.padStart(2, "0");
    return `${mmPadded}/${yyyy}`;
  };

  const yearTicks = useMemo(() => {
    const seen = new Set();
    const ticks = [];
    for (const pt of series) {
      const raw = pt.month; // "YYYY/MM"
      if (!raw) continue;
      const [yyyy] = String(raw).split("/");
      if (!seen.has(yyyy)) {
        seen.add(yyyy);
        ticks.push(raw);
      }
    }
    return ticks;
  }, [series]);

  const xTickFormatterYearOnly = (val) => {
    if (!val) return "";
    const [yyyy] = String(val).split("/");
    return yyyy;
  };

  /* ============================================================
     EXPORT PNG
     ============================================================ */
  async function doExportPNG() {
    if (!exportRef.current) return;

    const clonedNode = cloneWithComputedStyles(exportRef.current);
    clonedNode.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

    const width = Math.ceil(exportRef.current.scrollWidth);
    const height = Math.ceil(exportRef.current.scrollHeight);

    const scale = 2;

    const serializedHTML = new XMLSerializer().serializeToString(clonedNode);

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="${width * scale}"
           height="${height * scale}"
           viewBox="0 0 ${width} ${height}">
        <foreignObject x="0" y="0" width="${width}" height="${height}">
          ${serializedHTML}
        </foreignObject>
      </svg>
    `.trim();

    const svgBase64 = window.btoa(unescape(encodeURIComponent(svgString)));
    const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error("Export PNG failed: canvas.toBlob() returned null");
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Portfolio_${filters.startISO}_${filters.endISO}.png`;
            a.click();
            URL.revokeObjectURL(url);
          },
          "image/png",
          0.95
        );
      } catch (err) {
        console.error("PNG export error:", err);
      }
    };

    img.onerror = (e) => {
      console.error("Could not render SVG to image", e);
    };

    img.src = imgSrc;
  }

  return (
    // OUTER: scroll container for the live UI
    <div className="w-full h-full flex flex-col py-2 overflow-y-scroll bg-white">
      {/* INNER: full natural-height content.
          We export THIS. It is NOT scroll-clipped. */}
      <div className="flex flex-col gap-4" ref={exportRef}>
        {/* FILTER BAR */}
        <div className="flex flex-wrap items-end gap-4 text-sm">
          {/* Start Date */}
          <DateDropdown
            label="Start"
            valueISO={filters.startISO}
            onChangeISO={filters.setStartISO}
          />

          {/* End Date */}
          <DateDropdown
            label="End"
            valueISO={filters.endISO}
            onChangeISO={filters.setEndISO}
          />

          {/* Properties */}
          <PropertyMultiSelect
            options={filters.options.pscodes}
            selected={filters.pscodes}
            setSelected={filters.setPscodes}
            dropdownId="props"
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
          />

          {/* Screen */}
          <div className="flex flex-col">
            <div className="text-xs text-zinc-500 mb-1">Screen</div>
            <div className="relative">
              <select
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm min-w-[8rem] hover:bg-zinc-50"
                value={filters.screenresult ?? ""}
                onChange={(e) =>
                  filters.setScreenresult(e.target.value || null)
                }
              >
                <option value="">Any</option>
                {filters.options.screenresults.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collections */}
          <div className="flex flex-col">
            <div className="text-xs text-zinc-500 mb-1">Collections</div>
            <div className="relative">
              <select
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm min-w-[8rem] hover:bg-zinc-50"
                value={filters.collections}
                onChange={(e) => filters.setCollections(e.target.value)}
              >
                <option value="any">Any</option>
                <option value="with">With Balance</option>
                <option value="without">No Balance</option>
              </select>
            </div>
          </div>

          {/* Evicted */}
          <div className="flex flex-col">
            <div className="text-xs text-zinc-500 mb-1">Evicted</div>
            <div className="relative">
              <select
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm min-w-[8rem] hover:bg-zinc-50"
                value={filters.evicted}
                onChange={(e) => filters.setEvicted(e.target.value)}
              >
                <option value="any">Any</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          <div className="flex-1" />

          <button
            onClick={doExportPNG}
            className="self-start px-4 py-2 rounded-xl border bg-zinc-900 text-white text-sm shadow-sm hover:opacity-90"
          >
            Export PNG
          </button>
        </div>

        {/* DASH CONTENT */}
        <div className="flex flex-col gap-4">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border p-4 shadow-sm">
              <div className="text-sm text-zinc-500">Late-payment rate</div>
              <div className="text-3xl font-semibold">
                {snapshot ? pct(snapshot.pct_late_payers) : "--"}
              </div>
            </div>
            <div className="rounded-2xl border p-4 shadow-sm">
              <div className="text-sm text-zinc-500">NSF count</div>
              <div className="text-3xl font-semibold">
                {snapshot ? num(snapshot.nsf_count) : "--"}
              </div>
            </div>
            <div className="rounded-2xl border p-4 shadow-sm">
              <div className="text-sm text-zinc-500">Collections exposure</div>
              <div className="text-3xl font-semibold">
                ${snapshot ? num(snapshot.collections_exposure) : "--"}
              </div>
            </div>
            <div className="rounded-2xl border p-4 shadow-sm">
              <div className="text-sm text-zinc-500">$ delinquent</div>
              <div className="text-3xl font-semibold">
                ${snapshot ? num(snapshot.dollars_delinquent) : "--"}
              </div>
            </div>
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Late-payment rate over time */}
            <ChartCard title="Late-payment rate over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    ticks={yearTicks}
                    tickFormatter={xTickFormatterYearOnly}
                  />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Tooltip
                    labelFormatter={tooltipLabelFormatter}
                    formatter={(v) =>
                      typeof v === "number"
                        ? `${Math.round(v * 1000) / 10}%`
                        : v
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pct_late_payers"
                    name="% late"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* NSF count over time */}
            <ChartCard title="NSF count over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    ticks={yearTicks}
                    tickFormatter={xTickFormatterYearOnly}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={tooltipLabelFormatter} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="nsf_count"
                    name="NSF"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Collections exposure over time */}
            <ChartCard title="Collections exposure over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    ticks={yearTicks}
                    tickFormatter={xTickFormatterYearOnly}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={tooltipLabelFormatter} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="collections_exposure"
                    name="Collections"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* $ delinquent over time */}
            <ChartCard title="$ delinquent over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    ticks={yearTicks}
                    tickFormatter={xTickFormatterYearOnly}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={tooltipLabelFormatter} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="dollars_delinquent"
                    name="$ delinquent"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* FEATURE IMPORTANCE */}
          <div className="rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-500">
                  Primary Eviction Risk Drivers (tentative model)
                </div>
                <div className="text-2xl font-semibold">
                  {topFeatures.auc != null
                    ? `Top drivers (AUC ${
                        Math.round(topFeatures.auc * 100) / 100
                      })`
                    : "Top drivers"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {topFeatures.top_features?.slice(0, 6).map((f) => (
                <div
                  key={`${f.feature}`}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm shadow-sm"
                >
                  <div className="text-sm">{f.feature}</div>
                  <div className="text-sm font-semibold">
                    {Math.round(f.importance * 1000) / 10}%
                  </div>
                </div>
              ))}

              {(!topFeatures.top_features ||
                topFeatures.top_features.length === 0) && (
                <div className="text-zinc-500 text-sm">
                  Not enough data to compute predictors.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div> // end outer scroll container
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="mt-2" style={{ height: 260 }}>
        {children}
      </div>
    </div>
  );
}

export function PropertyView() {
  return <p className="p-6 text-sm text-zinc-700">This is the property view</p>;
}

export function AtRiskView() {
  return <p className="p-6 text-sm text-zinc-700">This is the at-risk view</p>;
}
