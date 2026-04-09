import { useEffect, useState } from 'react';

const NextIcon = () => {
  const [isToggleDarkMode, setIsToggleDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const darkModeEnabled = document.body.classList.contains('chakra-ui-dark');
      setIsToggleDarkMode(darkModeEnabled);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <div>
      {isToggleDarkMode ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.16699 9.99984H15.8337M15.8337 9.99984L10.0003 4.1665M15.8337 9.99984L10.0003 15.8332"
            stroke="white"
            strokeWidth="1.67"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.16699 9.99984H15.8337M15.8337 9.99984L10.0003 4.1665M15.8337 9.99984L10.0003 15.8332"
            stroke="#212529"
            strokeWidth="1.67"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};

export default NextIcon;

