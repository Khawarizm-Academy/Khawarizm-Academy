import React from 'react';

interface AuthSocialButtonProps {
  provider: 'google' | 'facebook';
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const AuthSocialButton: React.FC<AuthSocialButtonProps> = ({
  provider,
  label,
  onClick,
  disabled = false,
}) => {
  if (provider === 'google') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full h-12 px-4 py-3 bg-white hover:bg-slate-100 active:scale-[0.99] rounded-lg border border-slate-200 text-slate-900 text-sm font-bold font-['IBM_Plex_Sans_Arabic'] inline-flex justify-center items-center gap-3 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#E5B65C]"
      >
        <span>{label}</span>
        {/* Google Official Multicolored Vector Icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.9641 10.7105c-.18-.54-.2823-1.1168-.2823-1.7105s.1023-1.1705.2823-1.7105V4.9577H.9573A8.9965 8.9965 0 000 9c0 1.4523.3477 2.8268.9573 4.0423l3.0068-2.3318z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.9245 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9577L3.9641 7.2895C4.6718 5.1623 6.6559 3.5795 9 3.5795z"
            fill="#EA4335"
          />
        </svg>
      </button>
    );
  }

  // provider === 'facebook'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 px-4 py-3 bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.99] rounded-lg text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] inline-flex justify-center items-center gap-3 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#29A9FF]"
    >
      <span>{label}</span>
      {/* Facebook Official Icon */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M11.2502 1.49939H13.5V4.49963H11.2502C11.0513 4.49963 10.8605 4.57865 10.7199 4.71932C10.5792 4.85998 10.5002 5.05076 10.5002 5.24969V7.49987H13.5L12.7501 10.5001H10.5002V16.5006H7.50045V10.5001H5.25061V7.49987H7.50045V5.24969C7.50045 4.25505 7.89551 3.30114 8.59872 2.59783C9.30193 1.89451 10.2557 1.49939 11.2502 1.49939Z"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};
