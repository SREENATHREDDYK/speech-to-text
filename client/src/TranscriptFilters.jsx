import { CalendarIcon, SearchIcon, SortIcon } from './Icons.jsx';

const startOfDay = (daysAgo) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
};

export const getDateRange = (range) => {
    if (range === 'today') return { from: startOfDay(0), to: '' };
    if (range === 'yesterday') return { from: startOfDay(1), to: startOfDay(0) };
    if (range === '7') return { from: startOfDay(6), to: '' };
    if (range === '30') return { from: startOfDay(29), to: '' };
    return { from: '', to: '' };
};

function TranscriptFilters({ search, sort, dateRange, onSearchChange, onSortChange, onDateRangeChange }) {
    return (
        <div className="toolbar">
            <label className="field search-field">
                <SearchIcon />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search transcripts..."
                    maxLength={200}
                    aria-label="Search transcripts"
                />
            </label>
            <label className="field">
                <SortIcon />
                <select value={sort} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                </select>
            </label>
            <label className="field">
                <CalendarIcon />
                <select
                    value={dateRange}
                    onChange={(event) => onDateRangeChange(event.target.value)}
                    aria-label="Date filter"
                >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                </select>
            </label>
        </div>
    );
}

export default TranscriptFilters;
