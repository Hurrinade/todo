import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: () => void) => void;
  removeListener?: (listener: () => void) => void;
};

function getIsMobile(mediaQueryList?: MediaQueryList) {
  if (mediaQueryList) {
    return mediaQueryList.matches;
  }

  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return false;
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getIsMobile);

  React.useEffect(() => {
    const mql: LegacyMediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => {
      setIsMobile(getIsMobile(mql));
    };

    onChange();

    const addLegacyListener = mql.addListener;
    const removeLegacyListener = mql.removeListener;

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);

      return () => {
        mql.removeEventListener("change", onChange);
      };
    }

    addLegacyListener?.call(mql, onChange);

    return () => {
      removeLegacyListener?.call(mql, onChange);
    };
  }, []);

  return isMobile;
}
