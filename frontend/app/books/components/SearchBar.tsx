import { useState, useEffect } from "react"

interface SearchBarProps {
    onSearch: (searchTerm: string) => void;
    initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, initialValue = "" }) => {
    const [inputValue, setInputValue] = useState(initialValue);

    useEffect(() => {
        if (inputValue !== "" || initialValue !== "") {
            onSearch(inputValue);
        }
    }, [inputValue, onSearch, initialValue]);

    return (
        <input
            type="text"
            placeholder="Rechercher un livre par titre..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="p-2 border border-gray-300 rounded w-full max-w-md"
        />
    );
};

export default SearchBar;
