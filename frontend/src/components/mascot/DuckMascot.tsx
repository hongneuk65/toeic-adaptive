import { useId } from 'react';
import './duck-mascot.css';

type DuckMascotProps = {
  className?: string;
  label?: string;
  motion?: 'hero' | 'interactive' | 'none';
  astronaut?: boolean;
};

export const DuckMascot = ({ className = '', label, motion = 'none', astronaut = false }: DuckMascotProps) => {
  const id = useId();
  const body = `${id}-body`;
  const bill = `${id}-bill`;
  if (astronaut) return <svg className={`duck-mascot astronaut-duck ${className}`} viewBox="0 0 240 240" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <rect x="52" y="122" width="136" height="78" rx="26" fill="#9FB9DE" stroke="#46618B" strokeWidth="3" />
    <path d="m83 183-9 33 29 5 14-34m19-4 10 33 29-5-13-34" fill="#EDF6FF" stroke="#9FB9DE" strokeWidth="4" />
    <ellipse cx="121" cy="164" rx="58" ry="45" fill="#EFF7FF" stroke="#BDD3EC" strokeWidth="4" />
    <rect x="99" y="151" width="45" height="32" rx="9" fill="#213E77" stroke="#AAC6E8" strokeWidth="3" />
    <circle cx="111" cy="162" r="4" fill="#80E8E8" /><circle cx="127" cy="162" r="3" fill="#FFA969" /><path d="M108 174h25" stroke="#91B9ED" strokeWidth="3" strokeLinecap="round" />
    <g className="astronaut-duck-head">
      <circle cx="120" cy="91" r="71" fill="#E8F3FF" stroke="#BBD1EB" strokeWidth="4" />
      <circle cx="120" cy="91" r="60" fill="#153568" stroke="#799DC8" strokeWidth="3" />
      <path d="M76 101c-4-35 14-55 43-55s48 21 46 55c-1 29-19 45-44 45s-44-16-45-45Z" fill="#FFDB68" />
      <ellipse cx="96" cy="97" rx="6" ry="9" fill="#202E46" /><ellipse cx="145" cy="97" rx="6" ry="9" fill="#202E46" />
      <circle cx="98" cy="94" r="2" fill="white" /><circle cx="147" cy="94" r="2" fill="white" />
      <ellipse cx="85" cy="113" rx="9" ry="5" fill="#F6A183" /><ellipse cx="155" cy="113" rx="9" ry="5" fill="#F6A183" />
      <path d="M103 112c8-6 28-6 35 0 9 9-2 18-17 18s-27-9-18-18Z" fill="#F59C43" />
      <path d="M73 77c5-20 20-33 39-35" stroke="white" strokeWidth="7" strokeLinecap="round" opacity=".65" />
      <rect x="43" y="78" width="16" height="31" rx="7" fill="#AEC9E9" /><rect x="181" y="78" width="16" height="31" rx="7" fill="#AEC9E9" />
    </g>
    <path d="M75 151c-16-7-28-1-30 15l-2 29c0 9 17 11 19 1l6-19m99-26c16-7 28-1 30 15l2 29c0 9-17 11-19 1l-6-19" fill="#EDF6FF" stroke="#BDD3EC" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="50" cy="197" rx="14" ry="10" fill="#DAEBFC" stroke="#9FB9DE" strokeWidth="3" /><ellipse cx="191" cy="197" rx="14" ry="10" fill="#DAEBFC" stroke="#9FB9DE" strokeWidth="3" />
  </svg>;
  return <svg className={`duck-mascot duck-mascot--${motion} ${className}`} viewBox="0 0 240 240" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <defs>
      <linearGradient id={body} x1="65" y1="60" x2="175" y2="208" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF1A4" /><stop offset=".5" stopColor="#FFD65B" /><stop offset="1" stopColor="#F2B62E" /></linearGradient>
      <linearGradient id={bill} x1="100" y1="119" x2="125" y2="144" gradientUnits="userSpaceOnUse"><stop stopColor="#FFB459" /><stop offset="1" stopColor="#ED852F" /></linearGradient>
    </defs>
    <ellipse cx="121" cy="222" rx="65" ry="8" fill="#0B286D" fillOpacity=".18" />
    <path d="M79 206c-16 0-29 8-27 14 2 5 35 5 44 1l2-15-19 0Zm65 0c16 0 29 8 27 14-2 5-35 5-44 1l-2-15 19 0Z" fill="#F59A37" />
    <path d="M67 153c-17 6-26 17-27 34 11-1 19-4 26-10" fill="#F4C040" />
    <ellipse cx="121" cy="172" rx="66" ry="44" fill={`url(#${body})`} />
    <ellipse cx="118" cy="178" rx="43" ry="28" fill="#FFED97" fillOpacity=".65" />
    <path d="M73 95c-1-37 19-63 50-63 34 0 55 27 54 61l-2 19c-2 28-23 46-51 46-31 0-53-19-52-47l1-16Z" fill={`url(#${body})`} />
    <path d="M118 35c-9-11-6-19 2-17 3 1 5 4 7 10 4-9 12-8 12-2 0 4-4 8-9 11" fill="#FFE57D" />
    <path d="M80 79c6-22 22-33 42-33" stroke="#FFF7CB" strokeWidth="8" strokeLinecap="round" opacity=".75" />
    <ellipse cx="93" cy="110" rx="7" ry="10" fill="#292A39" /><ellipse cx="151" cy="110" rx="7" ry="10" fill="#292A39" />
    <circle cx="95" cy="107" r="2.5" fill="white" /><circle cx="153" cy="107" r="2.5" fill="white" />
    <ellipse cx="83" cy="125" rx="10" ry="6" fill="#F99577" fillOpacity=".65" /><ellipse cx="162" cy="125" rx="10" ry="6" fill="#F99577" fillOpacity=".65" />
    <path d="M102 124c5-6 31-6 37 0 7 7-2 17-18 17s-26-10-19-17Z" fill={`url(#${bill})`} /><path d="M107 129c9 4 20 4 29 0" stroke="#C77328" strokeWidth="2" strokeLinecap="round" />
    <path d="M68 99c0-41 23-67 55-67s56 27 56 67" stroke="#285DD8" strokeWidth="10" strokeLinecap="round" />
    <rect x="60" y="91" width="19" height="36" rx="9" fill="#4089FF" /><rect x="168" y="91" width="19" height="36" rx="9" fill="#4089FF" />
    <rect x="61" y="96" width="6" height="25" rx="3" fill="#90C5FF" /><path d="M177 123c0 17-9 22-24 22" stroke="#285DD8" strokeWidth="4" strokeLinecap="round" /><rect x="141" y="140" width="17" height="9" rx="4.5" fill="#1A419C" />
    <path d="M91 148c15 10 44 11 62 1l-3 16c-17 7-39 6-55-1l-4-16Z" fill="#3177EE" /><path d="m145 160 13 26-15 5-13-27" fill="#4089FF" /><path d="m142 181 12-4" stroke="#90C5FF" strokeWidth="3" />
    <path className="duck-mascot-wing" d="M163 163c14-6 28-3 33 7 5 9-5 25-20 25-11 0-19-11-13-32Z" fill="#FFD65B" stroke="#E9AE30" strokeWidth="2" />
  </svg>;
};
