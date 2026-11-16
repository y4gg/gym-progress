export function isWorkoutPathname(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/offline" ||
    /^\/w\/[^/]+(?:\/create)?\/?$/.test(pathname) ||
    /^\/e\/[^/]+(?:\/(?:history|logs))?\/?$/.test(pathname)
  );
}
