import { useEffect, useMemo, useRef, useState } from "react";
import { Header, UserNavigation } from "./DashboardComponents";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function UserView({ user, onSwapView, onLogout }) {
  const [activeView, setActiveView] = useState('portfolio')
  return (
    <div className="w-screen h-screen bg-zinc-200 flex flex-col scroll-y-overflow">
      <div className="w-full">
        <Header user={user} onSwapView={onSwapView} onLogout={onLogout} />
      </div>

      <div className="flex-grow flex justify-center items-center">
        <div className="w-11/12 h-[90%] bg-white rounded-2xl flex flex-col shadow-xl">
          <div className="flex-grow flex justify-center items-stretch overflow-hidden p-6">
            { activeView === "portfolio" && ( <PortfolioView /> )}
            { activeView === "property" && ( <PropertyView /> )}
            { activeView === "at-risk" && ( <AtRiskView /> )}
          </div>
          <div className="w-full mb-4">
            <UserNavigation activeView={activeView} setActiveView={setActiveView} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Pill({label, value}){
  return (
    <div className="rounded-2xl bg-zinc-100 border border-zinc-200 px-4 py-2 text-sm flex items-center gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function useFilters() {
  const [options, setOptions] = useState({ pscodes: [], screenresults: [] });
  const [pscode, setPscode] = useState(null);
  const [screenresult, setScreenresult] = useState(null);
  const [collections, setCollections] = useState("any"); // any | with | without
  const [evicted, setEvicted] = useState("any"); // any | Yes | No

  const [start, setStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 11);
    return d.toISOString().slice(0,7);
  });
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0,7));

  useEffect(() => {
    fetch("http://localhost:5000/filters/options").then(r => r.json()).then(setOptions).catch(()=>{});
  }, []);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    if (pscode) params.set("pscode", pscode);
    if (screenresult) params.set("screenresult", screenresult);
    if (collections !== "any") params.set("collections", collections);
    if (evicted !== "any") params.set("evicted", evicted);
    return params.toString();
  }, [start, end, pscode, screenresult, collections, evicted]);

  return {
    options, start, end, pscode, screenresult, collections, evicted,
    setStart, setEnd, setPscode, setScreenresult, setCollections, setEvicted,
    queryString: qs
  };
}

export function PortfolioView() {
  const filters = useFilters();
  const [snapshot, setSnapshot] = useState(null);
  const [series, setSeries] = useState([]);
  const [topFeatures, setTopFeatures] = useState({ auc: null, top_features: [] });
  const exportRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [snap, ts, feat] = await Promise.all([
        fetch(`http://localhost:5000/kpis/snapshot?${filters.queryString}`).then(r => r.json()),
        fetch(`http://localhost:5000/kpis/timeseries?${filters.queryString}`).then(r => r.json()),
        fetch(`http://localhost:5000/features/importance?${filters.queryString}`).then(async r => {
          if (r.ok) return r.json();
          return { auc: null, top_features: [] };
        }),
      ]);
      setSnapshot(snap);
      setSeries(ts);
      setTopFeatures(feat);
    })();
  }, [filters.queryString]);

  const num = (n) => (n ?? 0).toLocaleString();
  const pct = (p) => `${Math.round((p ?? 0)*1000)/10}%`;

  async function doExportPNG() {
    const html2canvas = (await import("html2canvas")).default;
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { scale: 2 });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `Portfolio_${filters.start}_${filters.end}.png`;
    a.click();
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Pill label="Start" value={
          <input type="month" className="bg-transparent outline-none" value={filters.start} onChange={e=>filters.setStart(e.target.value)} />
        }/>
        <Pill label="End" value={
          <input type="month" className="bg-transparent outline-none" value={filters.end} onChange={e=>filters.setEnd(e.target.value)} />
        }/>
        <Pill label="Property" value={
          <select className="bg-transparent outline-none" value={filters.pscode ?? ""} onChange={(e)=>filters.setPscode(e.target.value || null)}>
            <option value="">All</option>
            {filters.options.pscodes.map((p)=> <option key={p} value={p}>{p}</option>)}
          </select>
        }/>
        <Pill label="Screen" value={
          <select className="bg-transparent outline-none" value={filters.screenresult ?? ""} onChange={(e)=>filters.setScreenresult(e.target.value || null)}>
            <option value="">Any</option>
            {filters.options.screenresults.map((s)=> <option key={s} value={s}>{s}</option>)}
          </select>
        }/>
        <Pill label="Collections" value={
          <select className="bg-transparent outline-none" value={filters.collections} onChange={(e)=>filters.setCollections(e.target.value)}>
            <option value="any">Any</option>
            <option value="with">With Balance</option>
            <option value="without">No Balance</option>
          </select>
        }/>
        <Pill label="Evicted" value={
          <select className="bg-transparent outline-none" value={filters.evicted} onChange={(e)=>filters.setEvicted(e.target.value)}>
            <option value="any">Any</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        }/>
        <div className="flex-1"></div>
        <button onClick={doExportPNG} className="px-4 py-2 rounded-xl border bg-zinc-900 text-white hover:opacity-90">
          Export PNG
        </button>
      </div>

      <div ref={exportRef} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-zinc-500">Late-payment rate</div>
            <div className="text-3xl font-semibold">{snapshot ? pct(snapshot.pct_late_payers) : "--"}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-zinc-500">NSF count</div>
            <div className="text-3xl font-semibold">{snapshot ? num(snapshot.nsf_count) : "--"}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-zinc-500">Collections exposure</div>
            <div className="text-3xl font-semibold">${snapshot ? num(snapshot.collections_exposure) : "--"}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-zinc-500">$ delinquent</div>
            <div className="text-3xl font-semibold">${snapshot ? num(snapshot.dollars_delinquent) : "--"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Late-payment rate over time">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v)=>`${Math.round(v*100)}%`} />
                <Tooltip formatter={(v)=> typeof v === "number" ? `${Math.round(v*1000)/10}%` : v} />
                <Legend />
                <Line type="monotone" dataKey="pct_late_payers" name="% late" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="NSF count over time">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="nsf_count" name="NSF" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Collections exposure over time">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="collections_exposure" name="Collections" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="$ delinquent over time">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="dollars_delinquent" name="$ delinquent" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-500">Eviction risk drivers (Random Forest)</div>
              <div className="text-2xl font-semibold">Top features {topFeatures.auc != null ? `(AUC ${Math.round(topFeatures.auc*100)/100})` : ""}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {topFeatures.top_features?.slice(0,12).map((f) => (
              <div key={f.feature} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <div className="text-sm">{f.feature}</div>
                <div className="text-sm font-semibold">{(Math.round(f.importance*1000)/10)}%</div>
              </div>
            ))}
            {(!topFeatures.top_features || topFeatures.top_features.length === 0) && (
              <div className="text-zinc-500 text-sm">Not enough data in the selected window to compute importances.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartCard({title, children}){
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="mt-2" style={{height: 260}}>
        {children}
      </div>
    </div>
  )
}

export function PropertyView() {
  return <p className="p-6">This is the property view</p>
}

export function AtRiskView() {
  return <p className="p-6">This is the at-risk view</p>
}
