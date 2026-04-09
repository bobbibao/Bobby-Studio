export const CheckedSuccessIcon = ({ className = '', isDarkMode = false }) => {

  if (isDarkMode) {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="24" fill="#051B11"/>
        <path d="M34 23.0799V23.9999C33.9988 26.1563 33.3005 28.2545 32.0093 29.9817C30.7182 31.7088 28.9033 32.9723 26.8354 33.5838C24.7674 34.1952 22.5573 34.1218 20.5345 33.3744C18.5117 32.6271 16.7847 31.246 15.611 29.4369C14.4373 27.6279 13.8798 25.4879 14.0217 23.3362C14.1636 21.1844 14.9972 19.1362 16.3983 17.4969C17.7994 15.8577 19.6928 14.7152 21.7962 14.24C23.8996 13.7648 26.1003 13.9822 28.07 14.8599M34 15.9999L24 26.0099L21 23.0099" stroke="#198754" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="none" viewBox="0 0 56 56">
      <rect width="48" height="48" x="4" y="4" fill="#D1FADF" rx="24"></rect>
      <rect width="48" height="48" x="4" y="4" stroke="#ECFDF3" strokeWidth="8" rx="24"></rect>
      <path
        stroke="#039855"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M38 27.08V28a10 10 0 1 1-5.93-9.14M38 20 28 30.01l-3-3"
      ></path>
    </svg>
  );
};

