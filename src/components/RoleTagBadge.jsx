const ROLE_CONFIG = {
  decision_maker: { label: "Quyết định", color: "bg-blue-100 text-blue-700" },
  influencer: { label: "Ảnh hưởng", color: "bg-purple-100 text-purple-700" },
  user: { label: "Người dùng", color: "bg-gray-100 text-gray-600" },
  gatekeeper: { label: "Cổng vào", color: "bg-orange-100 text-orange-700" }
};

export default function RoleTagBadge({ role }) {
  const config = ROLE_CONFIG[role] || { label: role, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`badge ${config.color}`}>
      {config.label}
    </span>
  );
}
