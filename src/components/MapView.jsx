import { MapContainer, TileLayer, Marker, Popup, ScaleControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getEstimatedCoords } from "../utils/geo";
import { Building2, Navigation, Phone, ExternalLink } from "lucide-react";

/**
 * Fix for Leaflet marker icon paths in Vite/React
 */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapView({ accounts, onAccountClick }) {
  const vnCenter = [16.0544, 108.2022]; // Đà Nẵng

  return (
    <div className="h-[calc(100vh-280px)] rounded-2xl overflow-hidden shadow-inner bg-surface-900 border border-surface-700/50 relative">
      <MapContainer 
        center={vnCenter} 
        zoom={6} 
        scrollWheelZoom={true} 
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // Using a darker tile for the Obsidian Pulse aesthetic if possible, but OSM is standard.
          // Dark mode option: url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {accounts.map(acc => {
          const position = getEstimatedCoords(acc.region, acc.id);
          return (
            <Marker key={acc.id} position={position}>
              <Popup className="premium-popup">
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/20 rounded-md">
                      <Building2 size={14} className="text-primary" />
                    </div>
                    <h3 className="font-bold text-slate-100">{acc.name}</h3>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Navigation size={12} />
                      <span>{acc.address || acc.region || "Chưa có địa chỉ"}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2">
                    <button 
                      onClick={() => onAccountClick(acc.id)}
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      Chi tiết <ExternalLink size={10} />
                    </button>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acc.name + " " + acc.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center"
                    >
                      <Navigation size={12} />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        <ScaleControl position="bottomleft" />
      </MapContainer>

      {/* Legend / Overlay */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-surface-800/80 backdrop-blur-md border border-surface-700/50 p-3 rounded-xl shadow-xl space-y-2 max-w-[150px]">
        <div className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Mật độ khách hàng</div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-primary shadow-glow-sm"></div>
           <span className="text-[10px] text-slate-300 font-bold">Khách hàng hiện tại</span>
        </div>
        <div className="flex items-center gap-2 opacity-50">
           <div className="w-2 h-2 rounded-full bg-slate-400"></div>
           <span className="text-[10px] text-slate-400 font-bold">Tiềm năng (Leads)</span>
        </div>
      </div>
    </div>
  );
}
