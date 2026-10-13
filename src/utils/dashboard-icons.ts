const paths: Record<string, string> = {
  facebook: '<path stroke="none" fill="#1877f2" d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5c-.6-.1-1.7-.2-3-.2-3.1 0-5 1.9-5 5.3V9H7v4h3v9Z"/>',
  google: '<path stroke="#4285f4" stroke-width="4" d="M21 12h-9m9 0c0 3-1 5-3 7"/><path stroke="#34a853" stroke-width="4" d="M18 19a9 9 0 0 1-14-3"/><path stroke="#fbbc05" stroke-width="4" d="M4 16a9 9 0 0 1 0-8"/><path stroke="#ea4335" stroke-width="4" d="M4 8a9 9 0 0 1 14-3"/>',
  mobile: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',
  desktop: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tablet: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 19h2"/>',
  android: '<path d="m7 3 2 3m8-3-2 3M5 12h14v6H5ZM5 10a7 7 0 0 1 14 0M8 18v3m8-3v3M2 12v5m20-5v5"/><circle cx="9" cy="9" r=".5"/><circle cx="15" cy="9" r=".5"/>',
  apple: '<path d="M15 2c0 3-2 4-4 4 0-2 1-4 4-4ZM17 7c-3-2-4 0-5 0s-3-2-6 0c-5 4-1 14 2 14 2 0 2-1 4-1s2 1 4 1c2 0 4-4 4-5-4-1-5-6-1-8Z"/>',
  windows: '<path d="m3 5 8-1v7H3Zm10-1 8-1v8h-8ZM3 13h8v7l-8-1Zm10 0h8v8l-8-1Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  link: '<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  articles: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  audience: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  backup: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
  sparkles: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4ZM20 2v4m-2-2h4"/>',
  external: '<path d="M15 3h6v6m0-6-9 9M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>',
  logout: '<path d="M9 5H5v14h4m5-14 5 7-5 7m-5-7h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  pulse: '<path d="M2 12h4l3-8 6 16 3-8h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M5 8a7 7 0 0 1 12-3l3 7M4 12l3 7a7 7 0 0 0 12-3"/>',
};
export function dashboardIcon(name: string) {
  return '<svg class="cms-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.articles) + '</svg>';
}
export function dashboardEscape(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
