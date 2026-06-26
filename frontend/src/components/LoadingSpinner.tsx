// src/components/LoadingSpinner.tsx
import { useEffect, useRef } from "react";
import { Spinner } from "spin.js";
import "spin.js/spin.css";

const LoadingSpinner = () => {
  const spinnerRef = useRef<HTMLDivElement>(null);
  const spinnerInstance = useRef<Spinner | null>(null);

  useEffect(() => {
    if (spinnerRef.current) {
      spinnerInstance.current = new Spinner({
        lines: 15,
        length: 15,
        width: 5,
        radius: 20,
        scale: 0.9,
        corners: 1,
        color: "#000000",
        fadeColor: "transparent",
        animation: "spinner-line-fade-quick",
        rotate: 0,
        direction: 1,
        speed: 1,
        zIndex: 2e9,
        className: "spinner",
        top: "50%",
        left: "50%",
        shadow: "0 0 1px transparent",
        position: "absolute",
      }).spin(spinnerRef.current);
    }

    return () => {
      if (spinnerInstance.current) {
        spinnerInstance.current.stop();
      }
    };
  }, []);

  return <div ref={spinnerRef} className="flex justify-center items-center h-96" />;
};

export default LoadingSpinner;
