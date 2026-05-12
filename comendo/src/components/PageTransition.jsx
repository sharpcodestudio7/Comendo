const PageTransition = ({ children }) => (
  <>
    <style>{`
      @keyframes pageEnter {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0);   }
      }
      .page-transition {
        animation: pageEnter 0.4s ease-out;
      }
    `}</style>
    <div className="page-transition">
      {children}
    </div>
  </>
);

export default PageTransition;
