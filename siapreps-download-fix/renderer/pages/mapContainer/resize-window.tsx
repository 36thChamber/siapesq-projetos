import { useEffect } from "react";
function usePreventWindowResize(minWidth: number, minHeight: number) {
  useEffect(() => {
    const handleResize = () => {
      const { innerWidth, innerHeight } = window;

      if (innerWidth < minWidth || innerHeight < minHeight) {
        window.resizeTo(
          Math.max(innerWidth, minWidth),
          Math.max(innerHeight, minHeight)
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [minWidth, minHeight]);
}

export default usePreventWindowResize;
