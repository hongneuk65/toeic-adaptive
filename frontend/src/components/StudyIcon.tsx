const paths: Record<string, string> = {
 home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 route: 'M5 5h11a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h11M3 3h4v4H3ZM17 19h4v4h-4Z',
 headphones: 'M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7ZM20 12h1v7h-4v-7Z',
 book: 'M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1m0-15c3-2 7-2 10-1v15c-3-1-7-1-10 1Zm0 0v15',
 layers: 'm12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5M3 18l9 5 9-5',
 cards: 'M7 4h14v16H7ZM3 7v14h14M11 9h6M11 13h4',
 exam: 'M8 3H4v19h16V3h-4M8 2h8v4H8ZM8 11h8M8 15h8M8 19h4',
 clock: 'M3 11a9 9 0 1 1 3 8M3 4v7h7M12 7v6l4 2',
};
export function StudyIcon({ name, className = '' }: { name: string; className?: string }) {
 return <svg className={className} width="20" height="20" viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.book} /></svg>;
}
