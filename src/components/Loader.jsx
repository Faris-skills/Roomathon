// src/components/Loader.jsx

const Loader = ({ size = 10, color = "text-purple-600" }) => {
  const sizeClass = `h-${size} w-${size}`;
  return (
    <svg
      className={`animate-spin ${sizeClass} ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        />
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"
        />
    </svg>
  );
};

export default Loader;
