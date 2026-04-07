import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { renderToString } from "react-dom/server";
import { MapPin, Building, Activity, Star } from "lucide-react";
import CurrencyDisplay from "./CurrencyDisplay";
import ScoreBadge from "./ScoreBadge";
import { Link } from "react-router-dom";

/**
 * Custom Leaflet Marker with Lucide icons and Glow effects
 */
export default function MapMarker({ position, type, data, isLead }) {
  // Define icon based on type
  const getIcon = () => {
    let color = "#8B0000"; // Biomedia Red (Default for Account)
    let IconComponent = Building;

    if (isLead) {
      color = "#F59E0B"; // Amber for Market Intel/Leads
      IconComponent = Star;
    } else if (type === "hospital") {
      color = "#10B981"; // Green for Hospital
      IconComponent = Activity;
    }

    const iconHtml = renderToString(
      <div 
        className="relative flex items-center justify-center"
        style={{ 
          width: '32px', 
          height: '32px', 
          backgroundColor: `${color}20`, 
          border: `2px solid ${color}`,
          borderRadius: '10px',
          boxShadow: `0 0 15px ${color}40`,
          color: color
        }}
      >
        <IconComponent size={18} />
        <div 
          className="absolute -bottom-1 w-2 h-2 rounded-full" 
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    );

    return L.divIcon({
      html: iconHtml,
      className: "custom-leaflet-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  return (
    <Marker position={position} icon={getIcon()}>
      <Popup>
        <div className="p-4 min-w-[240px] space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start gap-3">
            <div>
              <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight">
                {data.name || data.title}
              </h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {data.region} • {data.type || data.category}
              </p>
            </div>
            <ScoreBadge score={data.score || data.relevance_score} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
            <div className="text-center border-r border-white/5">
              <p className="text-[9px] text-slate-500 font-black uppercase">Pipeline</p>
              <p className="text-xs font-bold text-white">
                {data.pipeline_value ? <CurrencyDisplay value={data.pipeline_value} /> : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-500 font-black uppercase">Chỉ số</p>
              <p className="text-xs font-bold text-primary">
                {isLead ? `${data.relevance_score}% RLV` : `${data.contacts_count || 0} Contacts`}
              </p>
            </div>
          </div>

          {/* Action */}
          <div className="pt-2">
            {isLead ? (
               <button className="w-full btn-primary !py-2 !text-[10px] uppercase tracking-widest">
                 Chuyển đổi thành Account
               </button>
            ) : (
              <Link 
                to={`/accounts/${data.id}`} 
                className="w-full btn-secondary !py-2 !text-[10px] uppercase tracking-widest flex items-center justify-center"
              >
                Xem chi tiết
              </Link>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
