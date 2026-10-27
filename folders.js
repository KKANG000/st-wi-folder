// Pure folder logic. settings = { folders: { [name]: { books: string[], collapsed: boolean } } }

export const MODULE_NAME = 'st_lorefolders';

export function normalize(raw) {
    const out = { folders: {} };
    const src = raw && typeof raw.folders === 'object' && raw.folders ? raw.folders : {};
    for (const [name, f] of Object.entries(src)) {
        if (!name) continue;
        out.folders[name] = {
            books: Array.isArray(f?.books) ? f.books.filter(b => typeof b === 'string') : [],
            collapsed: f?.collapsed === true,
        };
    }
    return out;
}

export function folderOf(settings, book) {
    return Object.keys(settings.folders).find(n => settings.folders[n].books.includes(book)) ?? '';
}

// folder '' = no folder
export function moveBook(settings, book, folder) {
    for (const f of Object.values(settings.folders)) f.books = f.books.filter(b => b !== book);
    if (folder && settings.folders[folder]) settings.folders[folder].books.push(book);
}

export function createFolder(settings, name) {
    name = String(name ?? '').trim();
    if (!name || settings.folders[name]) return false;
    settings.folders[name] = { books: [], collapsed: false };
    return true;
}

export function renameFolder(settings, from, to) {
    to = String(to ?? '').trim();
    if (!settings.folders[from] || !to || settings.folders[to]) return false;
    settings.folders[to] = settings.folders[from];
    delete settings.folders[from];
    return true;
}

export function deleteFolder(settings, name) {
    delete settings.folders[name];
}

export function hiddenBooks(settings) {
    return new Set(Object.values(settings.folders).filter(f => f.collapsed).flatMap(f => f.books));
}
