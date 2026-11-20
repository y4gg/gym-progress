export function isSettingsPathname(pathname: string) {
  return /^\/settings(?:\/(?:training|appearance|sync))?\/?$/.test(pathname);
}

export function isLocalAppPathname(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/offline" ||
    /^\/w\/[^/]+(?:\/create)?\/?$/.test(pathname) ||
    /^\/e\/[^/]+(?:\/(?:history|logs))?\/?$/.test(pathname) ||
    isSettingsPathname(pathname)
  );
}
