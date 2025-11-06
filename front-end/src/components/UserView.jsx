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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
    <div className="fixed w-screen h-screen bg-zinc-700 flex flex-col">
      <div className="w-full">
        <Header user={user} onSwapView={onSwapView} onLogout={onLogout} />
      </div>

      <div className="flex-grow flex justify-center items-center p-8 min-h-0">
        <div className="w-[98%] h-full bg-white rounded-2xl flex flex-col shadow-xl">
          <div className="flex-grow flex justify-center items-stretch overflow-hidden p-4">
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
    <div className="w-full h-full flex flex-col py-2 overflow-auto scrollbar-hide bg-white">
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
                    stroke="#0A1A33"
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
                    stroke="#0A1A33"
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
                    stroke="#0A1A33"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* $ delinquent over time */}
            <ChartCard title="Delinquent over time ($)">
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
                    stroke="#0A1A33"
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
                    ? `Top drivers (AUC ${Math.round(topFeatures.auc * 100) / 100
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

// { propertyId: '', propertyName: 'The Charles', propertyCode: '', image: null }, // Missing 'The Charles' information
const PROPERTY_LIST = [
  { propertyId: 'DD494', propertyName: 'Austin Boulevard', propertyCode: '1005', image: null },
  { propertyId: 'DD483', propertyName: 'Austin Gardens', propertyCode: '1003', image: null },
  { propertyId: 'DD486', propertyName: 'Austin Parks', propertyCode: '1004', image: null },
  { propertyId: 'DD492', propertyName: 'Austin Square', propertyCode: '1004c', image: null },
  { propertyId: 'DD537', propertyName: 'Bleecker Street', propertyCode: '1404', image: null },
  { propertyId: 'DD541', propertyName: 'Byron Bay', propertyCode: '1406', image: null },
  { propertyId: 'DD539', propertyName: 'Harpers', propertyCode: '1405', image: null },
  { propertyId: 'BR704', propertyName: 'Hastings End', propertyCode: '1407', image: null },
  { propertyId: 'DD524', propertyName: 'The Hudson (A)', propertyCode: '1102', image: null },
  { propertyId: 'DD530', propertyName: 'The Hudson (B)', propertyCode: '1103', image: null },
  { propertyId: 'DD544', propertyName: 'Olympus TH', propertyCode: '1408', image: null },
  { propertyId: 'DD546', propertyName: 'Rombauer TH', propertyCode: '1409', image: null },
  { propertyId: 'DD473', propertyName: 'Sage Hill', propertyCode: '1410', image: null },
  { propertyId: 'CD392', propertyName: 'Sloane Street', propertyCode: '1301', image: null },
  { propertyId: 'CD393', propertyName: 'Sloane Street (East)', propertyCode: '1302', image: null },
  { propertyId: 'DD500', propertyName: 'Stags Leap', propertyCode: '1007', image: null },
  { propertyId: 'CS574', propertyName: 'The Beacon (North)', propertyCode: '1501', image: null },
  { propertyId: 'CS575', propertyName: 'The Beacon (South)', propertyCode: '1502', image: null },
  { propertyId: 'DD515', propertyName: 'The Boat House', propertyCode: '1101', image: null },
  { propertyId: 'EH954', propertyName: 'The Chloe', propertyCode: '1104', image: null },
  { propertyId: 'DD478', propertyName: 'The Flats', propertyCode: '1411', image: null },
  { propertyId: 'DD533', propertyName: 'The Wharf', propertyCode: '1403', image: null },
  { propertyId: 'DD522', propertyName: 'Wallis & Baker', propertyCode: '1601', image: null },
  { propertyId: 'BK659', propertyName: 'Wylder Square', propertyCode: '1303', image: null },
];

// const properties = [
//   { id: 1, name: 'Thousand Oaks', image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/6760-windhaven-pkwy-the-colony-tx-High-Res-1-EDIT-scaled.jpg" },
//   { id: 2, name: 'The Hudson', image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/3075-painted-lake-circle-the-colony-tx-High-Res-8-scaled.jpg" },
//   { id: 3, name: 'Apartments at The Sound', image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/3333-bleecker-st-coppell-tx-1-MLS-13.jpg" },
//   { id: 4, name: 'Sage Hill', image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/1F2A6039-scaled.jpg" },
//   // { id: 5, name: 'The Flats', image: null },
//   { id: 6, name: 'Wallis & Baker', image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/Wallis-and-Baker-Grapevine_sculptures-2.jpg" },
//   { id: 7, name: 'Wylder Square', image: "https://b2679851.smushcdn.com/2679851/wp-content/uploads/2023/05/Wylder-Square-Leasing-Center-scaled.jpg?lossy=1&strip=1&webp=1" },
//   { id: 8, name: 'Hastings End', image: "https://b2679851.smushcdn.com/2679851/wp-content/uploads/2024/02/HE_-Leasing-Center-2-scaled.jpg?lossy=1&strip=1&webp=1" },
//   { id: 9, name: 'The Beacon', image: "https://b2679851.smushcdn.com/2679851/wp-content/uploads/2024/02/565-coit-rd-plano-tx-75075-High-Res-12-scaled.jpg?lossy=1&strip=1&webp=1" },
//   { id: 10, name: 'The Chloe', image: "https://b2679851.smushcdn.com/2679851/wp-content/uploads/2024/11/Chloe_leasing-3-scaled.jpg?lossy=1&strip=1&webp=1" },
//   { id: 11, name: 'August Hills', image: "https://b2679851.smushcdn.com/2679851/wp-content/uploads/2025/04/AH_EXT-1.jpg?lossy=1&strip=1&webp=1" },
//   { id: 12, name: 'Hartwood', image: "https://b2679851.smushcdn.com/2679851/wp-content/uploads/2025/04/2024-05-01_Hartwood-Square_Building-B_Corner-scaled.jpg?lossy=1&strip=1&webp=1" }
// ];

function PropertyList({ onPropertySelect }) {
  return (
    <div className="w-full h-full flex justify-center items-start rounded-lg overflow-auto scrollbar-hide">
      <div className="p-8">

        {/* gap-y-8 gap-x-12 */}
        <div className="grid grid-cols-4 gap-16">
          {PROPERTY_LIST.map((property) => (
            <div
              key={property.propertyId}
              onClick={() => onPropertySelect(property)}
              className="w-[420px] bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-all duration-500 ease-in-out hover:scale-[1.03]"
            >
              <div className="h-60 bg-zinc-200 flex items-center justify-center overflow-hidden">
                {property.image &&
                  <img
                    src={property.image}
                    alt={property.propertyName}
                    className="w-full h-full object-cover object-center"
                  />}
              </div>

              <div className="p-6">
                <h2 className="text-xl font-light italic text-[#0A1A33]">
                  {property.propertyName}
                </h2>


              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Map UI-friendly names to actual tenant object keys
const fieldMap = {
  "Risk Score": "riskscore",
  "Total Debt": "totdebt",
  "Rent-to-Income": "rentincratio",
  "Debt-to-Income": "debtincratio",
};

function PropertyDetail({ property, onBack, tenantData, loading }) {
  const tenants = tenantData[property.propertyCode] || [];

  const [selectedTenants, setSelectedTenants] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("None");
  const [selectedSign, setSelectedSign] = useState("Greater");
  const [filteredTenants, setFilteredTenants] = useState(tenants);
 

  const handleShowFilter = () => {
    setShowFilters((prev) => !prev); // controls visibility locally
  };

  // function to filter tenants based on current selections
  const applyFilter = (field = selectedFilter, sign = selectedSign, value = userInput) => {
    console.log(selectedFilter,selectedSign,userInput)
    const fieldKey = fieldMap[selectedFilter]; // get the actual object key
    const valNum = Number(value);
    if (field == null || field == "") {
      setFilteredTenants(null)
      return
    }
    if (!fieldKey) return; // no filter selected
    const filtered = tenants.filter((t) => {
      const v = t[fieldKey];
      if (v == null) return false; // skip nulls
      switch (sign) {
        case "Greater":
          return v > valNum;
        case "Equal":
          return v === valNum;
        case "Less":
          return v < valNum;
        default:
          return true;
      }
    });
    setFilteredTenants(filtered);
  };
  // render variable. either shows filtered tenants or all tenants if no filter
  const tenantsToRender = filteredTenants || tenants;

  useEffect(() => {
    console.log(selectedTenants);
  }, [selectedTenants])

  const handleSelectTenant = (tenantCode) => {
    setSelectedTenants((prev) =>
      prev.includes(tenantCode)
        ? prev.filter((code) => code !== tenantCode)
        : [...prev, tenantCode]
    );
  };


  return (
    <div className="relative w-full h-full flex flex-col bg-white rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">

        {/* Back Button */}
        <button
          onClick={onBack}
          className="p-2 hover:bg-zinc-200 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
            <path d="M232,144a64.07,64.07,0,0,1-64,64H80a8,8,0,0,1,0-16h88a48,48,0,0,0,0-96H51.31l34.35,34.34a8,8,0,0,1-11.32,11.32l-48-48a8,8,0,0,1,0-11.32l48-48A8,8,0,0,1,85.66,45.66L51.31,80H168A64.07,64.07,0,0,1,232,144Z" />
          </svg>
        </button>

        {/* Property Name */}
        <h2 className="text-2xl font-semibold text-[#0A1A33]">
          {`${property.propertyName} - ${property.propertyCode}`}
        </h2>

        {/* Global Filter Button */}
        <button 
          onClick={handleShowFilter} 
          className="p-2 hover:bg-zinc-200 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
            <path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z" />
          </svg>
        </button>
        {showFilters && (
        <div className="absolute top-12 left-340 w-96 p-4 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50">
          <h3 className="text-sm font-semibold mb-3">Screening Filters</h3>
          <div className="space-y-3">
            {/* Dropdown filter for Critera */}
            <div className="p-3 rounded-lg border border-zinc-200 box-border shadow-sm">
              <label className="block text-xs font-medium mb-1">
                Screening Criteria
              </label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full h-10 border rounded px-2 py-1 text-sm"
              >
                <option value="">None</option>
                <option value="Risk Score">Risk Score</option>
                <option value="Total Debt">Total Debt</option>
                <option value="Rent-to-Income">Rent-to-Income</option>
                <option value="Debt-to-Income">Debt-to-Income</option>
              </select>
            </div>
            
            {/* Dropdown filter for Sign */}
            <div className="p-3 rounded-lg border border-zinc-200 box-border shadow-sm">
              <label className="block text-xs font-medium mb-1">
                Filter Type
              </label>
              <select
                value={selectedSign}
                onChange={(e) => setSelectedSign(e.target.value)}
                className="w-full h-10 text-sm border rounded px-2 text-sm"
              >
                <option value="Greater">{">"}</option>
                <option value="Equal">{"="}</option>
                <option value="Less">{"<"}</option>
              </select>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 box-border shadow-sm">
              <label className="block text-xs font-medium mb-1">Filter Value</label>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter filter value"
                className="w-full h-10 px-2 text-sm border rounded shadow-sm"
              />
            </div>
            <div className="p-3 flex justify-center rounded-lg border border-zinc-200 box-border shadow-sm">
              <button 
                onClick={() => applyFilter()}
                className="p-2 px-6 bg-[#0A1A33] text-zinc-100 text-lg rounded-full shadow-lg hover:bg-[#13294B] transition-colors" 
              >
              Filter Data
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="flex-1 flex gap-4 p-6 overflow-hidden">

        {/* Tenant Side */}
        <div className="flex-1 bg-zinc-100 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-black">Tenants</h3>
            <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
              {loading ? '...' : `${tenantsToRender.length} active`}
            </span>
          </div>

          <div className="flex-1 overflow-auto scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Fetching tenants...</p>
              </div>
            ) : tenants.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-gray-200 border-b border-gray-300">
                      <th className="w-16 px-5 py-4 text-center text-md font-semibold text-gray-800 border-r border-gray-300">
                        #
                      </th>
                      <th className="px-3 py-5 text-left text-md font-semibold text-gray-800 border-r border-gray-300">
                        Tenant Code
                      </th>
                      <th className="px-3 py-5 text-left text-md font-semibold text-gray-800 border-r border-gray-300">
                        Move In Date
                      </th>
                      <th className="px-3 py-5 text-left text-md font-semibold text-gray-800 border-r border-gray-300">
                        Move Out Date
                      </th>
                      <th className="px-3 py-5 text-left text-md font-semibold text-gray-800 border-r border-gray-300">
                        Risk Score
                      </th>
                      <th className="w-24 py-5 text-center text-md font-semibold text-gray-800">
                        Select
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsToRender.map((tenant, index) => {
                      const tenantCode = tenant.tscode || tenant;
                      const isSelected = selectedTenants.includes(tenantCode);

                      return (
                        <tr
                          key={tenantCode || index}
                          className={`border-b border-gray-300 transition-colors ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                            }`}
                        >
                          <td className="px-3 py-5 text-md text-center text-[#0A1A33] border-r border-gray-300">
                            {index + 1}
                          </td>
                          <td className="px-3 py-5 text-md text-[#0A1A33] border-r border-gray-300">
                            {tenantCode}
                          </td>
                          <td className="px-3 py-5 text-md text-[#0A1A33] border-r border-gray-300">
                            {tenant.dtmovein ? new Date(tenant.dtmovein).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-5 text-md text-[#0A1A33] border-r border-gray-300">
                            {tenant.dtmoveout ? new Date(tenant.dtmoveout).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-5 text-md text-[#0A1A33] border-r border-gray-300">
                            {tenant.riskscore}
                          </td>
                          <td className="px-3 py-5 text-center">
                            <div className="flex items-center justify-center h-full">
                              <button
                                onClick={() => handleSelectTenant(tenantCode)}
                                className={`w-8 h-6 rounded-md border transition-all ${isSelected
                                  ? "bg-[#0A1A33] border-[#0A1A33]"
                                  : "border-gray-300 hover:border-[#0A1A33]"
                                  }`}
                              />
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-gray-500 font-medium">No active tenants</p>
                <p className="text-sm text-gray-400 mt-1">This property currently has no residents</p>
              </div>
            )}
          </div>
        </div>

        {/* EDA / Graphs / Analysis */}
        <div className="flex-1 bg-zinc-100 rounded-lg p-4 flex flex-col">
          <h3 className="text-base font-semibold text-black mb-3">Analytics</h3>
          <div className="flex-1">
            <p className="text-black">Graphs and charts will be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PropertyView() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [tenantData, setTenantData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/tenants/active')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tenant data');
        return res.json();
      })
      .then(data => {
        setTenantData(data);
        setLoading(false);
        console.log(data)
      })
      .catch(err => {
        console.error('Error fetching tenants:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (selectedProperty) {
    return (
      <PropertyDetail
        property={selectedProperty}
        onBack={() => setSelectedProperty(null)}
        tenantData={tenantData}
        loading={loading}
      />
    );
  }

  return <PropertyList onPropertySelect={setSelectedProperty} />;
}

export function AtRiskView() {
  return <p className="p-6 text-sm text-zinc-700">This is the at-risk view</p>;
}
