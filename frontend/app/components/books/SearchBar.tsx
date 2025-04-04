// "use client";

// import { useState } from "react";

// type SearchBarProps = {
//     onSearch: (query: string) => void;
// };

// export const SearchBar = ({ onSearch }: SearchBarProps) => {
//     const [query, setQuery] = useState("");

//     const handleSearch = (e: React.FormEvent) => {
//         e.preventDefault();
//         onSearch(query);
//     };

//     return (
//         <form onSubmit={handleSearch} className="flex mb-4">
//             <input
//                 type="text"
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Rechercher des livres..."
//                 className="border rounded-md p-2 flex-grow"
//             />
//             <button type="submit" className="ml-2 bg-blue-500 text-white rounded-md p-2">
//                 Rechercher
//             </button>
//         </form>
//     );
// }; 