export const NETWORKS = [
  { value: 'sjp', label: "St. James's Place (SJP)", available: true },
  { value: 'quilter', label: 'Quilter', available: false },
  { value: 'openwork', label: 'Openwork', available: false },
  { value: 'sesame', label: 'Sesame', available: false },
  { value: 'independent', label: 'Independent (FCA Direct Authorised)', available: true },
];

export function networkLabel(value) {
  return NETWORKS.find((n) => n.value === value)?.label || value;
}
