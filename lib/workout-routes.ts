export function isOverviewPathname(pathname: string) {
  return pathname === "/overview" || pathname === "/overview/";
}

export function isWorkoutPathname(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/offline" ||
    isOverviewPathname(pathname) ||
    /^\/w\/[^/]+(?:\/create)?\/?$/.test(pathname) ||
    /^\/e\/[^/]+(?:\/(?:history|logs))?\/?$/.test(pathname)
  );
}
