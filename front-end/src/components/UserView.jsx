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
  const [selectedTenants, setSelectedTenants] = useState([]);
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
            {activeView === "property" && <PropertyView selectedTenants={selectedTenants} setSelectedTenants={setSelectedTenants} />}
            {activeView === "at-risk" && <AtRiskView selectedTenants={selectedTenants} setSelectedTenants={setSelectedTenants} />}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="text-sm text-zinc-500">Total delinquent exposure</div>
            <div className="text-3xl font-semibold">
              ${snapshot ? num(snapshot.collections_exposure) : "--"}
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Late-payment rate over time */}
          <div className="lg:col-span-1">
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
          </div>

          {/* NSF count over time */}
          <div className="lg:col-span-1">
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
          </div>

          {/* Total delinquent exposure over time – centered */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="w-full lg:w-2/3">
              <ChartCard title="Total delinquent exposure over time ($)">
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
                      name="Total delinquent exposure"
                      dot={false}
                      stroke="#0A1A33"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
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

const PROPERTY_GROUPINGS = [
  {
    name: "Apartments at The Sound",
    image: "https://www.apartmentsatthesound.com/wp-content/uploads/2025/05/HA_Twilight_Harpers-Court-at-Harpers-at-The-Sound_July2020-1-1024x768.jpg",
    properties: [
      { propertyId: 'DD537', propertyName: 'Bleecker Street', propertyCode: '1404' },
      { propertyId: 'DD541', propertyName: 'Byron Bay', propertyCode: '1406' },
      { propertyId: 'DD539', propertyName: 'Harpers', propertyCode: '1405' },
      { propertyId: 'BR704', propertyName: "Hasting's End", propertyCode: '1407' },
      { propertyId: 'DD544', propertyName: 'Olympus', propertyCode: '1408' },
      { propertyId: 'DD546', propertyName: 'Rombauer', propertyCode: '1409' },
      { propertyId: 'DD533', propertyName: 'The Wharf', propertyCode: '1403' },
      { propertyId: 'DD478', propertyName: 'The Flats', propertyCode: '1411' },
    ]
  },

  {
    name: "Beacon Square",
    image: "https://www.thebeaconapartments.com/wp-content/uploads/2025/04/BE_Pool-11-1024x683.jpg",
    properties: [
      { propertyId: 'CS574', propertyName: 'The Beacon (North)', propertyCode: '1501' },
      { propertyId: 'CS575', propertyName: 'The Beacon (South)', propertyCode: '1502' },
    ]
  },

  {
    name: "Grapevine Mills Crossing",
    image: "https://www.wallisandbaker.com/wp-content/uploads/2025/03/Wallis-Baker-Pool-Shot-July-2021-1024x683.png",
    properties: [
      { propertyId: 'DD522', propertyName: 'Wallis & Baker', propertyCode: '1601' },
    ]
  },

  {
    name: "Sage Hill",
    image: "https://www.sagehillapts.com/wp-content/uploads/2025/01/SH_Pool-at-The-Stone-House-2-1024x683.jpg",
    properties: [
      { propertyId: 'DD473', propertyName: 'Sage Hill', propertyCode: '1410' },
    ]
  },

  {
    name: "Sloan Corners",
    image: "https://media.billingsleyco.com/m/41db5d39117b7da4/original/Sloan_Corners_Fairview_Allen_Retail.jpg",
    properties: [
      { propertyId: 'CD392', propertyName: 'Sloane Street', propertyCode: '1301' },
      { propertyId: 'CD393', propertyName: 'Sloane Street (East)', propertyCode: '1302' },
      { properyId: null, propertyName: 'Hartwood', propertyCode: null }
    ]
  },

  {
    name: "The Boat House",
    image: "https://irp.cdn-website.com/d78e83d1/dms3rep/multi/2875-painted-lake-circle-the-colony-tx-High-Res-57.jpg",
    properties: [
      { propertyId: 'DD515', propertyName: 'The Boat House', propertyCode: '1101' },
    ]
  },

  {
    name: "The Chloe",
    image: "https://thechloeapartments.com/wp-content/uploads/2025/04/The-Chloe-The-Colony-TX-Indochine-Clubroom-18-scaled.jpg",
    properties: [
      { propertyId: 'EH954', propertyName: 'The Chloe', propertyCode: '1104' },
    ]
  },

  {
    name: "The Hudson",
    image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/3075-painted-lake-circle-the-colony-tx-High-Res-8-scaled.jpg",
    properties: [
      { propertyId: 'DD524', propertyName: 'The Hudson (A)', propertyCode: '1102' },
      { propertyId: 'DD530', propertyName: 'The Hudson (B)', propertyCode: '1103' },
    ]
  },

  {
    name: "The Landing",
    image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/4216-sloane-street-carrollton-tx-High-Res-9-scaled.jpg",
    properties: [
      { propertyId: 'BK659', propertyName: 'Wylder Square', propertyCode: '1303' },
    ]
  },

  {
    name: "Thousand Oaks",
    image: "https://wwwbillingsley.wpengine.com/wp-content/uploads/2022/02/6760-windhaven-pkwy-the-colony-tx-High-Res-13-scaled.jpg",
    properties: [
      { propertyId: 'DD494', propertyName: 'Austin Boulevard', propertyCode: '1005' },
      { propertyId: 'DD483', propertyName: 'Austin Gardens', propertyCode: '1003' },
      { propertyId: 'DD486', propertyName: 'Austin Parks', propertyCode: '1004' },
      { propertyId: 'DD492', propertyName: 'Austin Square', propertyCode: '1004c' },
      { propertyId: 'DD500', propertyName: "Stag's Leap", propertyCode: '1007' },
      { propertyId: 'DD506', propertyName: 'The Charles', propertyCode: '1008' },
    ]
  },
]

function PropertyList({ onPropertySelect }) {
  const [hoveredPropertyGrouping, setHoveredPropertyGrouping] = useState(null);

  return (
    <div className="w-full h-full flex justify-center items-start rounded-lg overflow-auto scrollbar-hide">
      <div className="p-8">
        <div className="grid grid-cols-4 gap-16">
          {PROPERTY_GROUPINGS.map((propertyGroup, idx) => {
            const propertyLength = propertyGroup.properties.length > 1;

            return (
              <div
                key={idx}
                onMouseEnter={() => propertyLength && setHoveredPropertyGrouping(idx)}
                onMouseLeave={() => setHoveredPropertyGrouping(null)}
                onClick={() => !propertyLength && onPropertySelect(propertyGroup.properties[0])}
                className="w-[420px] bg-white rounded-lg shadow-md cursor-pointer relative"
              >
                <div className="h-60 bg-zinc-200 flex items-center justify-center overflow-hidden rounded-tl-lg rounded-tr-lg">
                  {propertyGroup.image ? (
                    <img
                      src={propertyGroup.image}
                      alt={propertyGroup.name}
                      className="w-full h-full object-cover object-center transform-gpu transition-all duration-500 ease-in-out hover:scale-105 overflow-hidden"
                    />
                  ) : (
                    <span className="text-gray-400">Image</span>
                  )}
                </div>

                <div className="p-6">
                  <h2 className="text-xl font-light italic text-[#0A1A33]">
                    {propertyGroup.name}
                  </h2>
                </div>

                {/* Sub-property selection. Only have groups when propertyLength > 1 */}
                {propertyLength && hoveredPropertyGrouping === idx && (
                  <div style={{ top: '-1px', left: '-1px', right: '-1px', bottom: '-1px' }} className="absolute rounded-lg bg-zinc-200 flex items-start justify-start p-6">
                    <div className="w-full grid grid-cols-2 gap-3">
                      {propertyGroup.properties.map((property) => (
                        <button
                          key={property.propertyId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPropertySelect(property);
                          }}
                          className="px-5 py-4 bg-white rounded-lg text-lg font-medium text-[#0A1A33] hover:bg-[#0A1A33] hover:text-white hover:border-[#0A1A33] transition-all duration-200 shadow-md"
                        >
                          {property.propertyName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

// NEW: shared helpers for coloring numeric risk scores 0–100
function riskScoreClasses(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return "bg-zinc-100 text-zinc-600";
  }
  if (numeric < 30) return "bg-emerald-100 text-emerald-800";
  if (numeric < 60) return "bg-amber-100 text-amber-800";
  if (numeric < 80) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

function formatRiskScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return "–";
  return numeric.toFixed(1);
}

// Aggregate per-property stats from a list of tenants
// Aggregate per-property stats from a list of tenants
function computePropertyStats(tenants) {
  if (!Array.isArray(tenants) || tenants.length === 0) {
    return {
      count: 0,
      nsf: 0,
      late: 0,
      collections: 0,
    };
  }

  let nsf = 0;
  let late = 0;
  let collections = 0;

  for (const t of tenants) {
    // NSF count (dnumnsf from transacts / model payloads)
    nsf += Number(
      t.nsf_count ??
      t.dnumnsf ??
      0
    );

    // Late payment count (dnumlate from transacts / model payloads)
    late += Number(
      t.late_count ??
      t.dnumlate ??
      0
    );

    // Collections amount → from damoutcollections in transacts/model payloads
    const rawCollections =
      t.collections_amount ??
      t.damoutcollections ??
      t.collections_exposure ??
      t.collections ??
      0;

    // Always aggregate as positive dollars
    const collNum = Number(rawCollections);
    if (Number.isFinite(collNum)) {
      collections += Math.abs(collNum);
    }
  }

  return {
    count: tenants.length,
    nsf,
    late,
    collections,
  };
}


// Simple count formatter
function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString();
}

// Currency formatter (no decimals)
function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "–";
  return `$${n.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

// Percent of whole, with 1 decimal place
function formatPercent(part, whole) {
  const p = Number(part);
  const w = Number(whole);
  if (!Number.isFinite(p) || !Number.isFinite(w) || w <= 0) {
    return "0%";
  }
  const pct = (p / w) * 100;
  return `${pct.toFixed(1)}%`;
}

// Small card component for the analytics section
// Small card component for the analytics section
function renderMetricCard(title, value, subtitle) {
  return (
    <div className="rounded-xl border bg-zinc-50 p-4 shadow-sm flex flex-col">
      <div className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#0A1A33]">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-[11px] text-zinc-400">{subtitle}</div>
      )}
    </div>
  );
}

// Filtered-vs-total card (big filtered number, then "/ total")
function renderFilteredMetricCard(title, filteredValue, totalValue, subtitle) {
  return (
    <div className="rounded-xl border bg-zinc-50 p-4 shadow-sm flex flex-col">
      <div className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
        {title}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-[#0A1A33]">
          {filteredValue}
        </span>
        <span className="text-sm text-zinc-500">/ {totalValue}</span>
      </div>
      {subtitle && (
        <div className="mt-1 text-[11px] text-zinc-400">{subtitle}</div>
      )}
    </div>
  );
}


function PropertyDetail({
  property,
  onBack,
  screeningTenantData,
  transactionTenantData,
  loading,
  selectedTenants,
  setSelectedTenants,
}) {
  // Two underlying datasets keyed by propertyCode
  const tenantsScreening = screeningTenantData[property.propertyCode] || [];
  const tenantsTransaction = transactionTenantData[property.propertyCode] || [];

  // Which model view are we in?  "screening" | "transactions"
  const [viewMode, setViewMode] = useState("screening");

  // Screening filter UI state (only used in screening view)
  const [showFilters, setShowFilters] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Risk Score");
  const [selectedSign, setSelectedSign] = useState("Greater");

  // Quick search (top of table) – shared across both views
  const [tenantSearch, setTenantSearch] = useState("");
  const [unitSearch, setUnitSearch] = useState("");

  // Separate filtered lists per view
  const [filteredScreeningTenants, setFilteredScreeningTenants] =
    useState(null);
  const [filteredTransactionTenants, setFilteredTransactionTenants] =
    useState(null);

  useEffect(() => {
    console.log("Selected tenants:", selectedTenants);
  }, [selectedTenants]);

  const handleShowFilter = () => {
    setShowFilters((prev) => !prev);
  };

  // Only show tenants with move-in / lease dates in 2024+
  const MIN_DATE_2024 = new Date("2024-01-01");

  const screeningBase = tenantsScreening.filter((t) => {
    if (!t.dtmovein) return false;
    const d = new Date(t.dtmovein);
    return !Number.isNaN(d.getTime()) && d >= MIN_DATE_2024;
  });

  const transactionBase = tenantsTransaction.filter((t) => {
    const raw = t.lease_start || t.dtmovein;
    if (!raw) return false;
    const d = new Date(raw);
    return !Number.isNaN(d.getTime()) && d >= MIN_DATE_2024;
  });

  // Apply filters for whichever view is active
  const applyFilter = () => {
    const valueStr = String(userInput ?? "").trim();
    const valNum = Number(valueStr);

    const hasTenantFilter = tenantSearch.trim().length > 0;
    const hasUnitFilter = unitSearch.trim().length > 0;

    if (viewMode === "screening") {
      let filtered = screeningBase;

      const fieldKey = fieldMap[selectedFilter]; // actual object key
      const hasNumericFilter =
        fieldKey && valueStr !== "" && Number.isFinite(valNum);

      // Numeric field filter (screening only)
      if (hasNumericFilter) {
        filtered = filtered.filter((t) => {
          const v = t[fieldKey];
          if (v == null) return false;
          switch (selectedSign) {
            case "Greater":
              return v > valNum;
            case "Less":
              return v < valNum;
            default:
              return true;
          }
        });
      }

      // Tenant code filter
      if (hasTenantFilter) {
        const search = tenantSearch.toLowerCase();
        filtered = filtered.filter((t) => {
          const code = (t.tscode || "").toString().toLowerCase();
          return code.includes(search);
        });
      }

      // Unit code filter
      if (hasUnitFilter) {
        const search = unitSearch.toLowerCase();
        filtered = filtered.filter((t) => {
          const code = (t.uscode || "").toString().toLowerCase();
          return code.includes(search);
        });
      }

      // If nothing actually filtering, clear instead of keeping a copy
      if (!hasNumericFilter && !hasTenantFilter && !hasUnitFilter) {
        setFilteredScreeningTenants(null);
        return;
      }

      setFilteredScreeningTenants(filtered);
    } else {
      // TRANSACTIONS VIEW – only tenant/unit filters (no numeric side-panel)
      let filtered = transactionBase;

      // Tenant code filter
      if (hasTenantFilter) {
        const search = tenantSearch.toLowerCase();
        filtered = filtered.filter((t) => {
          const code = (t.tscode || "").toString().toLowerCase();
          return code.includes(search);
        });
      }

      // Unit code filter
      if (hasUnitFilter) {
        const search = unitSearch.toLowerCase();
        filtered = filtered.filter((t) => {
          const code = (t.uscode || "").toString().toLowerCase();
          return code.includes(search);
        });
      }

      if (!hasTenantFilter && !hasUnitFilter) {
        setFilteredTransactionTenants(null);
        return;
      }

      setFilteredTransactionTenants(filtered);
    }
  };

  const clearFilters = () => {
    setSelectedFilter("Risk Score");
    setSelectedSign("Greater");
    setUserInput("");
    setTenantSearch("");
    setUnitSearch("");
    setFilteredScreeningTenants(null);
    setFilteredTransactionTenants(null);
  };

  // Property-level stats for each model
  const screeningOverallStats = computePropertyStats(screeningBase);
  const screeningFilteredStats = computePropertyStats(
    filteredScreeningTenants || screeningBase
  );
  const transactionStats = computePropertyStats(transactionBase);

  const hasScreeningFilterApplied =
    Array.isArray(filteredScreeningTenants) &&
    filteredScreeningTenants.length > 0 &&
    filteredScreeningTenants.length !== screeningBase.length;

  // Decide which tenants to show based on view
  const baseTenants =
    viewMode === "screening" ? screeningBase : transactionBase;

  const tenantsToRender =
    viewMode === "screening"
      ? filteredScreeningTenants || screeningBase
      : filteredTransactionTenants || transactionBase;

  // ALWAYS sort highest → lowest by eviction risk score
  const tenantsSorted = [...tenantsToRender].sort((a, b) => {
    const aScore =
      a && a.eviction_risk_score != null
        ? Number(a.eviction_risk_score)
        : -Infinity;
    const bScore =
      b && b.eviction_risk_score != null
        ? Number(b.eviction_risk_score)
        : -Infinity;
    return bScore - aScore;
  });

  const handleSelectTenant = (tenant, name) => {
    setSelectedTenants((prev) => {
      const exists = prev.some(
        (t) => t.tenant.tscode === tenant.tscode && t.model === viewMode
      );

      if (exists) {
        return prev.filter(
          (t) => !(t.tenant.tscode === tenant.tscode && t.model === viewMode)
        );
      }

      return [...prev, { tenant, model: viewMode, name }];
    });
  };

  const hasTenants = baseTenants && baseTenants.length > 0;
  const filtersActive = showFilters && viewMode === "screening";

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg bg-white">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        {/* Back + property info */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 256 256"
            >
              <path
                fill="currentColor"
                d="M224 120H59.31l66.35-66.34a8 8 0 0 0-11.32-11.32l-80 80a8 8 0 0 0 0 11.32l80 80a8 8 0 0 0 11.32-11.32L59.31 136H224a8 8 0 0 0 0-16"
              />
            </svg>
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Property
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-semibold text-[#0A1A33]">
                {property.propertyName}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {property.propertyCode} • {property.propertyId}
              </span>
            </div>
          </div>
        </div>

        {/* Model toggle + screening filters button */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Model view
            </span>
            <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("screening")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  viewMode === "screening"
                    ? "bg-[#0A1A33] text-white shadow-sm"
                    : "text-zinc-700 hover:text-black"
                }`}
              >
                Screening
              </button>
              <button
                type="button"
                onClick={() => setViewMode("transactions")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  viewMode === "transactions"
                    ? "bg-[#0A1A33] text-white shadow-sm"
                    : "text-zinc-700 hover:text-black"
                }`}
              >
                Transactions
              </button>
            </div>
          </div>

          {viewMode === "screening" && (
            <button
              onClick={handleShowFilter}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:border-[#0A1A33] hover:text-[#0A1A33]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M4 6h16v2H4zm3 5h10v2H7zm4 5h2v2h-2z"
                />
              </svg>
              <span>Screening filters</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1">
        {/* Table + analytics */}
        <div
          className={`flex-1 p-6 transition-all duration-300 ${
            filtersActive ? "mr-80" : "mr-0"
          }`}
        >
          {/* Tenants table card */}
          <div className="mb-6 rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {viewMode === "screening"
                    ? "Screening model view"
                    : "Transaction model view"}
                </div>
                <div className="mt-1 text-sm text-zinc-600">
                  {loading
                    ? "Loading tenants…"
                    : hasTenants
                    ? `${baseTenants.length} tenants in this view`
                    : "No tenants in this view"}
                </div>
              </div>

              {/* Quick tenant/unit search inputs – now for BOTH views */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Tenant code search"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="w-32 rounded-md border px-2 py-1 text-xs focus:border-[#0A1A33] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Unit code search"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="w-32 rounded-md border px-2 py-1 text-xs focus:border-[#0A1A33] focus:outline-none"
                />
                <button
                  onClick={applyFilter}
                  className="rounded-md bg-[#0A1A33] px-3 py-1 text-xs font-semibold text-white hover:bg-[#14284e]"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-[440px] overflow-auto">
              {loading ? (
                <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                  Loading tenants…
                </div>
              ) : hasTenants ? (
                <table className="min-w-full border-t text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Tenant</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      {viewMode === "screening" ? (
                        <>
                          <th className="px-3 py-2 text-left">Move in</th>
                          <th className="px-3 py-2 text-left">Risk score</th>
                          <th className="px-3 py-2 text-right">Total debt</th>
                          <th className="px-3 py-2 text-right">
                            Rent-to-income
                          </th>
                          <th className="px-3 py-2 text-right">
                            Debt-to-income
                          </th>
                          {/* Eviction score = 2nd right-most column */}
                          <th className="px-3 py-2 text-left">
                            Eviction risk (0–100)
                          </th>
                          <th className="px-3 py-2 text-center">Select</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 text-left">Lease start</th>
                          <th className="px-3 py-2 text-left">
                            Eviction risk (0–100)
                          </th>
                          <th className="px-3 py-2 text-center">Select</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsSorted.map((tenant, index) => {
                      const tenantCode = (tenant.tscode || "").toString();
                      const unitCode = (tenant.uscode || "").toString();
                      const isSelected = selectedTenants.some(
                        (t) =>
                          t.tenant.tscode === tenant.tscode &&
                          t.model === viewMode
                      );

                      // CREDIT risk score from screening data
                      const creditRisk = tenant.riskscore;
                      const creditRiskDisplay = Number.isFinite(
                        Number(creditRisk)
                      )
                        ? Number(creditRisk).toFixed(0)
                        : "–";

                      // MODEL eviction risk score (0–100)
                      const evictionScore = tenant.eviction_risk_score;
                      const evictionScoreDisplay =
                        formatRiskScore(evictionScore);

                      return (
                        <tr
                          key={`${tenantCode}-${unitCode}-${index}`}
                          className="border-b last:border-b-0 hover:bg-zinc-50"
                        >
                          {/* Index, tenant, unit — always shown */}
                          <td className="px-3 py-3 text-xs text-zinc-500">
                            {index + 1}
                          </td>
                          <td className="px-3 py-3 text-sm text-[#0A1A33]">
                            {tenantCode || "—"}
                          </td>
                          <td className="px-3 py-3 text-sm text-[#0A1A33]">
                            {unitCode || "—"}
                          </td>

                          {viewMode === "screening" ? (
                            <>
                              {/* Move-in date (screening view) */}
                              <td className="px-3 py-3 text-sm text-[#0A1A33]">
                                {tenant.dtmovein
                                  ? new Date(
                                      tenant.dtmovein
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>

                              {/* CREDIT risk score from screening – plain text */}
                              <td className="px-3 py-3 text-sm text-[#0A1A33]">
                                {creditRiskDisplay}
                              </td>

                              {/* Total debt */}
                              <td className="px-3 py-3 text-right text-sm text-[#0A1A33]">
                                {tenant.totdebt != null
                                  ? Number(
                                      tenant.totdebt
                                    ).toLocaleString()
                                  : "—"}
                              </td>

                              {/* Rent-to-income */}
                              <td className="px-3 py-3 text-right text-sm text-[#0A1A33]">
                                {tenant.rentincratio != null
                                  ? `${tenant.rentincratio.toFixed(1)}%`
                                  : "—"}
                              </td>

                              {/* Debt-to-income */}
                              <td className="px-3 py-3 text-right text-sm text-[#0A1A33]">
                                {tenant.debtincratio != null
                                  ? `${tenant.debtincratio.toFixed(1)}%`
                                  : "—"}
                              </td>

                              {/* SCREENING MODEL eviction risk (0–100) – COLORED PILL (2nd right-most) */}
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex min-w-[3rem] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${riskScoreClasses(
                                    evictionScore
                                  )}`}
                                >
                                  {evictionScoreDisplay}
                                </span>
                              </td>

                              {/* Select (right-most) */}
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() =>
                                    handleSelectTenant(
                                      tenant,
                                      property.propertyName
                                    )
                                  }
                                  className={`h-6 w-8 rounded-md border transition-all ${
                                    isSelected
                                      ? "border-[#0A1A33] bg-[#0A1A33]"
                                      : "border-gray-300 hover:border-[#0A1A33]"
                                  }`}
                                  title={
                                    isSelected
                                      ? "Remove from at-risk list"
                                      : "Add to at-risk list"
                                  }
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              {/* Lease start / move-in (transactions view) */}
                              <td className="px-3 py-3 text-sm text-[#0A1A33]">
                                {tenant.lease_start
                                  ? new Date(
                                      tenant.lease_start
                                    ).toLocaleDateString()
                                  : tenant.dtmovein
                                  ? new Date(
                                      tenant.dtmovein
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>

                              {/* COLORED eviction risk (0–100) */}
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex min-w-[3rem] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${riskScoreClasses(
                                    evictionScore
                                  )}`}
                                >
                                  {evictionScoreDisplay}
                                </span>
                              </td>

                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() =>
                                    handleSelectTenant(
                                      tenant,
                                      property.propertyName
                                    )
                                  }
                                  className={`h-6 w-8 rounded-md border transition-all ${
                                    isSelected
                                      ? "border-[#0A1A33] bg-[#0A1A33]"
                                      : "border-gray-300 hover:border-[#0A1A33]"
                                  }`}
                                  title={
                                    isSelected
                                      ? "Remove from at-risk list"
                                      : "Add to at-risk list"
                                  }
                                />
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-gray-500">
                    No tenants in this view
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Try switching model views or choosing a different property.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Analytics: differs by model */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-black">
                {viewMode === "transactions"
                  ? "Property analytics – transaction model"
                  : "Property analytics – screening model"}
              </h3>
              <span className="text-xs text-zinc-500">
                {viewMode === "transactions"
                  ? "NSF, late payments, and collections for this property"
                  : hasScreeningFilterApplied
                  ? "Filtered tenants vs all screening tenants"
                  : "All screening tenants at this property"}
              </span>
            </div>

            {viewMode === "transactions" ? (
              transactionStats.count === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  No transaction model tenants with payment / collections data
                  for this property.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {renderMetricCard(
                    "Late payments",
                    formatCount(transactionStats.late)
                  )}
                  {renderMetricCard(
                    "NSF count",
                    formatCount(transactionStats.nsf)
                  )}
                  {renderMetricCard(
                    "Collections amount",
                    formatCurrency(transactionStats.collections)
                  )}
                </div>
              )
            ) : screeningOverallStats.count === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No screening tenants with payment / collections data for this
                property.
              </p>
            ) : (
              // SCREENING ANALYTICS: always exactly 3 cards total
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Late payments */}
                {hasScreeningFilterApplied
                  ? renderFilteredMetricCard(
                      "Late payments",
                      formatCount(screeningFilteredStats.late),
                      formatCount(screeningOverallStats.late),
                      `${formatPercent(
                        screeningFilteredStats.late,
                        screeningOverallStats.late
                      )} of property late payments`
                    )
                  : renderMetricCard(
                      "Late payments",
                      formatCount(screeningOverallStats.late),
                      "All screening tenants"
                    )}

                {/* NSF count */}
                {hasScreeningFilterApplied
                  ? renderFilteredMetricCard(
                      "NSF count",
                      formatCount(screeningFilteredStats.nsf),
                      formatCount(screeningOverallStats.nsf),
                      `${formatPercent(
                        screeningFilteredStats.nsf,
                        screeningOverallStats.nsf
                      )} of property NSF`
                    )
                  : renderMetricCard(
                      "NSF count",
                      formatCount(screeningOverallStats.nsf),
                      "All screening tenants"
                    )}

                {/* Collections amount */}
                {hasScreeningFilterApplied
                  ? renderFilteredMetricCard(
                      "Collections",
                      formatCurrency(screeningFilteredStats.collections),
                      formatCurrency(screeningOverallStats.collections),
                      `${formatPercent(
                        screeningFilteredStats.collections,
                        screeningOverallStats.collections
                      )} of property collections amount`
                    )
                  : renderMetricCard(
                      "Collections",
                      formatCurrency(screeningOverallStats.collections),
                      "All screening tenants"
                    )}
              </div>
            )}
          </div>
        </div>

        {/* Screening filters side panel */}
        <div
          className={`absolute right-0 top-0 h-full w-80 transform bg-white shadow-md transition-all duration-300 ease-out ${
            filtersActive
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-full opacity-0"
          }`}
        >
          <div className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0A1A33]">
                Screening filters
              </h3>
              <button
                onClick={handleShowFilter}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="m18.3 5.71l-1.41-1.42L12 9.17L7.11 4.29L5.7 5.71L10.59 10.6L5.7 15.49l1.41 1.42L12 12.03l4.89 4.88l1.41-1.42L13.41 10.6z"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Numeric filter only – tenant/unit search lives at the top of the table now */}
              <div>
                <label className="text-xs font-medium text-zinc-500">
                  Numeric field
                </label>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm focus:border-[#0A1A33] focus:outline-none"
                >
                  {Object.keys(fieldMap).map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500">
                  Comparison
                </label>
                <select
                  value={selectedSign}
                  onChange={(e) => setSelectedSign(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm focus:border-[#0A1A33] focus:outline-none"
                >
                  <option value="Greater">Greater than</option>
                  <option value="Less">Less than</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500">
                  Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm focus:border-[#0A1A33] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-auto flex gap-2 pt-6">
              <button
                onClick={applyFilter}
                className="flex-1 rounded-md bg-[#0A1A33] px-3 py-2 text-xs font-semibold text-white hover:bg-[#14284e]"
              >
                Apply filters
              </button>
              <button
                onClick={clearFilters}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PropertyView({ selectedTenants, setSelectedTenants }) {
  const [selectedProperty, setSelectedProperty] = useState(null);

  const [screeningTenantData, setScreeningTenantData] = useState({});
  const [transactionTenantData, setTransactionTenantData] = useState({});

  const [loadingScreening, setLoadingScreening] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState(null);

  // Screening model tenants (existing /tenants/active)
  // Screening model tenants (NEW /tenants/screening-eviction-risk)
  useEffect(() => {
    fetch("http://127.0.0.1:5000/tenants/screening-eviction-risk")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch screening tenant data");
        return res.json();
      })
      .then((data) => {
        setScreeningTenantData(data || {});
        setLoadingScreening(false);
        console.log("Screening-model tenants:", data);
      })
      .catch((err) => {
        console.error("Error fetching screening tenants:", err);
        setError((prev) => prev || err.message);
        setLoadingScreening(false);
      });
  }, []);


  // Transaction model tenants (new /tenants/eviction-risk)
  useEffect(() => {
    fetch("http://127.0.0.1:5000/tenants/eviction-risk")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch transaction model data");
        return res.json();
      })
      .then((data) => {
        setTransactionTenantData(data || {});
        setLoadingTransactions(false);
        console.log("Transaction-model tenants:", data);
      })
      .catch((err) => {
        console.error("Error fetching transaction-model tenants:", err);
        // don't overwrite an existing error if we already have one
        setError((prev) => prev || err.message);
        setLoadingTransactions(false);
      });
  }, []);

  const loading = loadingScreening || loadingTransactions;

  if (selectedProperty) {
    return (
      <PropertyDetail
        property={selectedProperty}
        onBack={() => setSelectedProperty(null)}
        screeningTenantData={screeningTenantData}
        transactionTenantData={transactionTenantData}
        loading={loading}
        selectedTenants={selectedTenants}
        setSelectedTenants={setSelectedTenants}
      />
    );
  }

  // You could surface `error` somewhere in UI if you want; keeping it silent for now
  return <PropertyList onPropertySelect={setSelectedProperty} />;
}
function AtRiskView({ selectedTenants }) {
  const [globalDrivers, setGlobalDrivers] = useState({
    screening: { top_drivers: [] },
    transactions: { top_drivers: [] },
  });
  const [globalDriversLoading, setGlobalDriversLoading] = useState(true);

  const [highlightedTenant, setHighlightedTenant] = useState(null);
  const [hoveredTenantCode, setHoveredTenantCode] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(
          "http://127.0.0.1:5000/models/global-drivers"
        );
        const json = res.ok ? await res.json() : {};
        if (!alive) return;

        setGlobalDrivers({
          screening: json.screening || { top_drivers: [] },
          transactions: json.transactions || { top_drivers: [] },
        });
      } catch (err) {
        if (!alive) return;
        console.error("Global drivers fetch error:", err);
        setGlobalDrivers({
          screening: { top_drivers: [] },
          transactions: { top_drivers: [] },
        });
      } finally {
        if (!alive) return;
        setGlobalDriversLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);


  // Split selected tenants by model type
  const transactionTenants = selectedTenants
    .filter((t) => t.model === "transactions")
    .sort((a, b) => {
      const codeA = a.tenant.tscode || "";
      const codeB = b.tenant.tscode || "";
      return codeA.localeCompare(codeB);
    });

  const screeningTenants = selectedTenants
    .filter((t) => t.model === "screening")
    .sort((a, b) => {
      const codeA = a.tenant.tscode || "";
      const codeB = b.tenant.tscode || "";
      return codeA.localeCompare(codeB);
    });

  function formatDate(dateString) {
    if (!dateString) return "—";

    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return `${month}/${day}/${year}`;
    }

    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US");
      }
    } catch (e) {
      // ignore
    }
    return dateString;
  }

  // Pretty-print driver values based on feature + model
    // Pretty-print driver values based on feature + model
    function formatDriverValue(featureKey, rawValue, model) {
    if (rawValue == null) return "—";

    // New: categorical driver (payment source)
    if (featureKey === "spaymentsource") {
      if (typeof rawValue === "string" && rawValue.trim().length > 0) {
        return rawValue;
      }
      return "—";
    }

    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) {
      return "—";
    }

    // Shared count / duration features
    if (featureKey === "dnumlate" || featureKey === "dnumnsf") {
      return numeric.toFixed(0);
    }
    if (featureKey === "davgdayslate" || featureKey === "tenure_days") {
      return `${numeric.toFixed(0)} days`;
    }

    // New: day-of-month and payment-source changes
    if (featureKey === "daypaid") {
      return `Day ${numeric.toFixed(0)}`;
    }
    if (featureKey === "dpaysourcechange") {
      return `${numeric.toFixed(0)}`;
    }

    // Screening model features (raw screening columns)
    if (model === "screening") {
      if (featureKey === "rentincratio" || featureKey === "debtincratio") {
        return `${numeric.toFixed(1)}%`;
      }
      if (featureKey === "totdebt") {
        return `$${numeric.toLocaleString()}`;
      }
      if (featureKey === "riskscore") {
        return numeric.toFixed(0);
      }
    }

    // Transaction model engineered features
    if (model === "transactions") {
      if (featureKey === "rent_to_income") {
        // stored as ratio 0–1, display as %
        return `${(numeric * 100).toFixed(1)}%`;
      }
    }

    // Generic fallback
    if (Number.isInteger(numeric)) {
      return numeric.toString();
    }
    return numeric.toFixed(1);
  }



  const TenantCard = ({ tenantData, model }) => {
    const [hovered, setHovered] = useState(false);
    const { tenant, name } = tenantData;

    const isHighlighted = highlightedTenant === tenant.tscode;
    const isHoveredMatch = hoveredTenantCode === tenant.tscode;

    // Eviction risk score (0–100)
    const hasScore =
      tenant.eviction_risk_score !== null &&
      tenant.eviction_risk_score !== undefined &&
      Number.isFinite(Number(tenant.eviction_risk_score));

    const evictionRisk = hasScore
      ? `${Number(tenant.eviction_risk_score).toFixed(1)}%`
      : "—";

    // Per-tenant drivers from backend (at most 3)
    const drivers = Array.isArray(tenant.drivers)
      ? tenant.drivers.slice(0, 3)
      : [];

    return (
      <div
        className={`relative rounded-xl bg-white p-6 shadow-md transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between ${
          isHighlighted ? "ring-4 ring-[#0A1A33] shadow-2xl" : ""
        }`}
        onMouseEnter={() => {
          setHovered(true);
          setHoveredTenantCode(tenant.tscode);
          setHighlightedTenant(tenant.tscode);
        }}
        onMouseLeave={() => {
          setHovered(false);
          setHoveredTenantCode(null);
          setHighlightedTenant(null);
        }}
      >
        {/* Front face: basic tenant info */}
        <div
          className={`flex flex-col justify-between h-full space-y-4 transition-opacity duration-200 ${
            hovered || isHoveredMatch ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Header */}
          <div className="border-b-1 border-[#0A1A33] pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md text-zinc-500 mb-1 font-bold">Tenant</p>
                <p className="text-2xl text-[#0A1A33]">
                  {tenant.tscode || "—"}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-md text-zinc-500 mb-1 font-bold">
                  Eviction Risk
                </p>
                <span
                  className={`inline-flex min-w-[4rem] items-center justify-center rounded-full px-3 py-1 text-xl font-bold ${riskScoreClasses(
                    tenant.eviction_risk_score
                  )}`}
                >
                  {evictionRisk}
                </span>
              </div>
            </div>
          </div>

          {/* Unit Code */}
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-md text-zinc-500 mb-1 pt-3 font-bold">Unit</p>
            <p className="text-2xl text-[#0A1A33]">{tenant.uscode || "—"}</p>
          </div>

          {/* Move-in date */}
          <div className="border-b-1 border-[#0A1A33] w-1/6 pb-3" />
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-md text-zinc-500 mb-1 pt-3 font-bold">
              Move In
            </p>
            <p className="text-2xl text-[#0A1A33]">
              {formatDate(tenant.dtmovein) || "—"}
            </p>
          </div>

          {/* Property name */}
          <div className="border-b-1 border-[#0A1A33] w-1/6 pb-3" />
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-md text-zinc-500 mb-1 pt-3 font-bold">
              Property
            </p>
            <p className="text-2xl text-[#0A1A33]">{name || "—"}</p>
          </div>
        </div>

        {/* Back face: top risk drivers */}
        {(hovered || isHoveredMatch) && (
          <div className="absolute inset-0 z-10 flex flex-col rounded-xl bg-gradient-to-br from-[#0A1A33] to-gray-900 text-white p-6">
            {drivers.length > 0 ? (
              drivers.map((d, idx) => (
                <div
                  key={d.feature_key || `${tenant.tscode}-${idx}`}
                  className={`flex flex-1 flex-col justify-center ${
                    idx > 0 ? "border-t border-white/10 mt-4 pt-4" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-md font-bold text-gray-200">
                        {d.feature_label}
                      </p>
                      <p className="text-2xl mt-1">
                        {formatDriverValue(d.feature_key, d.value, model)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-md font-bold text-gray-200">
                        Low-risk avg
                      </p>
                      <p className="text-2xl mt-1">
                        {formatDriverValue(
                          d.feature_key,
                          d.baseline,
                          model
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-300 text-center">
                  Not enough data yet to compute drivers for this tenant.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGrid = (tenants, title, modelType) => (
    <div className="flex-1 p-6 bg-gray-100 rounded-lg overflow-scroll scrollbar-hide">
      <h3 className="text-center text-3xl mb-4 text-[#0A1A33] italic">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-6">
        {tenants.length > 0 ? (
          tenants.map((tenantData, idx) => (
            <TenantCard
              key={`${modelType}-${tenantData.tenant.tscode}-${idx}`}
              tenantData={tenantData}
              model={modelType}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-xl text-zinc-400">Awaiting tenant selection</p>
          </div>
        )}
      </div>
    </div>
  );

    return (
    <div className="flex w-full h-full flex-col gap-y-4">
      {/* GLOBAL TOP DRIVERS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Screening model global drivers */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Screening model
              </div>
              <div className="text-sm text-zinc-700">
                Top eviction risk drivers (overall)
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {globalDriversLoading ? (
              <div className="text-xs text-zinc-400">
                Loading drivers…
              </div>
            ) : globalDrivers.screening.top_drivers &&
              globalDrivers.screening.top_drivers.length > 0 ? (
              globalDrivers.screening.top_drivers.slice(0, 3).map((d) => {
                const total =
                  globalDrivers.screening.top_drivers.reduce(
                    (sum, x) => sum + (x.importance || 0),
                    0
                  ) || 1;
                const pct = (d.importance || 0) / total;

                return (
                  <div
                    key={`screening-${d.feature_key}`}
                    className="flex-1 rounded-xl bg-zinc-50 px-3 py-2 shadow-sm"
                  >
                    <div className="text-[11px] text-zinc-500 truncate">
                      {d.feature_label}
                    </div>
                    <div className="text-lg font-semibold text-[#0A1A33]">
                      {(pct * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-zinc-400">
                Not enough data to compute screening drivers.
              </div>
            )}
          </div>
        </div>

        {/* Transaction model global drivers */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Transaction model
              </div>
              <div className="text-sm text-zinc-700">
                Top eviction risk drivers (overall)
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {globalDriversLoading ? (
              <div className="text-xs text-zinc-400">
                Loading drivers…
              </div>
            ) : globalDrivers.transactions.top_drivers &&
              globalDrivers.transactions.top_drivers.length > 0 ? (
              globalDrivers.transactions.top_drivers.slice(0, 3).map((d) => {
                const total =
                  globalDrivers.transactions.top_drivers.reduce(
                    (sum, x) => sum + (x.importance || 0),
                    0
                  ) || 1;
                const pct = (d.importance || 0) / total;

                return (
                  <div
                    key={`tx-${d.feature_key}`}
                    className="flex-1 rounded-xl bg-zinc-50 px-3 py-2 shadow-sm"
                  >
                    <div className="text-[11px] text-zinc-500 truncate">
                      {d.feature_label}
                    </div>
                    <div className="text-lg font-semibold text-[#0A1A33]">
                      {(pct * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-zinc-400">
                Not enough data to compute transaction drivers.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EXISTING AT-RISK TENANT GRIDS */}
      <div className="flex flex-1 gap-x-6 min-h-0">
        {renderGrid(screeningTenants, "Screening Insights", "screening")}
        {renderGrid(transactionTenants, "Transaction Insights", "transactions")}
      </div>
    </div>
  );
}
