export default function AnimationStyles() {
  return (
    <style>{`
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(24px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes highlightRow {
        0%   { background-color: #EEF2FF; }
        60%  { background-color: #EEF2FF; }
        100% { background-color: transparent; }
      }
      .row-new { animation: highlightRow 3s ease-out forwards; }
      .form-enter { animation: slideDown 0.25s ease-out; }
    `}</style>
  );
}
