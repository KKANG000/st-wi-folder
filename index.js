// ST Lore Folders: fold lorebook files into folders and hide them from the World Info lists.

import { MODULE_NAME, normalize, folderOf, moveBook, createFolder, renameFolder, deleteFolder, hiddenBooks } from './folders.js';

const LOG = '[st-lorefolders]';
const SELECTS = ['#world_info', '#world_editor_select'];

// Normalize once: render() keeps closures on this object, so it must never be replaced.
function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[MODULE_NAME]?.folders) extensionSettings[MODULE_NAME] = normalize(extensionSettings[MODULE_NAME]);
    return extensionSettings[MODULE_NAME];
}

function save() {
    SillyTavern.getContext().saveSettingsDebounced();
    render();
    apply();
}

// Hide collapsed books. A selected option is never hidden: jQuery val() skips disabled options.
function apply() {
    const hidden = hiddenBooks(getSettings());
    for (const sel of SELECTS) {
        for (const opt of document.querySelectorAll(`${sel} option[value]:not([value=""])`)) {
            const hide = hidden.has(opt.text) && !opt.selected;
            if (opt.hidden !== hide) { opt.hidden = hide; opt.disabled = hide; }
        }
    }
}

function editorBook() {
    const opt = document.querySelector('#world_editor_select option:checked');
    return opt && opt.value !== '' ? opt.text : '';
}

async function ask(title, value = '') {
    const r = await SillyTavern.getContext().Popup.show.input(title, '', value);
    return r === null ? null : String(r).trim();
}

function render() {
    const s = getSettings();
    const names = Object.keys(s.folders);
    const list = document.getElementById('stlf_list');
    list.replaceChildren(...names.map(name => {
        const f = s.folders[name];
        const el = document.createElement('span');
        el.className = 'stlf_folder' + (f.collapsed ? ' stlf_collapsed' : '');
        el.innerHTML = `<i class="fa-solid ${f.collapsed ? 'fa-folder' : 'fa-folder-open'}" title="접기/펼치기"></i><span></span><small>0</small><i class="fa-solid fa-pencil" title="이름 변경"></i><i class="fa-solid fa-trash-can" title="폴더 삭제"></i>`;
        el.children[1].textContent = name;
        el.children[2].textContent = String(f.books.length);
        el.children[0].onclick = () => { f.collapsed = !f.collapsed; save(); };
        el.children[3].onclick = async () => { const to = await ask('폴더 이름', name); if (to && renameFolder(s, name, to)) save(); };
        el.children[4].onclick = () => { deleteFolder(s, name); save(); };
        return el;
    }));

    const assign = document.getElementById('stlf_assign');
    const book = editorBook();
    assign.replaceChildren(new Option('폴더 없음', ''), ...names.map(n => new Option(n, n)));
    assign.value = book ? folderOf(s, book) : '';
    assign.disabled = !book;
}

function mountUi() {
    const top = document.getElementById('wiTopBlock');
    if (!top) throw new Error('#wiTopBlock not found');
    const box = document.createElement('div');
    box.id = 'stlf';
    box.innerHTML = '<small>로어북 폴더</small> <div id="stlf_new" class="menu_button menu_button_icon"><i class="fa-solid fa-folder-plus"></i><span>새 폴더</span></div><div id="stlf_list"></div>';
    top.before(box);
    box.querySelector('#stlf_new').onclick = async () => { const n = await ask('새 폴더 이름'); if (n && createFolder(getSettings(), n)) save(); };

    const assign = document.createElement('select');
    assign.id = 'stlf_assign';
    assign.title = '이 로어북을 폴더로 이동';
    // select2 puts its own container right after the hidden select; go after that
    const editor = document.getElementById('world_editor_select');
    (editor.nextElementSibling?.classList.contains('select2') ? editor.nextElementSibling : editor).after(assign);
    assign.onchange = () => { const b = editorBook(); if (b) { moveBook(getSettings(), b, assign.value); save(); } };
}

function init() {
    mountUi();
    render();
    apply();

    const { eventSource, event_types } = SillyTavern.getContext();
    for (const ev of [event_types.WORLDINFO_UPDATED, event_types.WORLDINFO_SETTINGS_UPDATED, event_types.CHAT_CHANGED]) {
        eventSource.on(ev, () => { apply(); render(); });
    }
    for (const sel of SELECTS) {
        const el = document.querySelector(sel);
        new MutationObserver(apply).observe(el, { childList: true });
        $(el).on('select2:opening change', () => { apply(); if (sel === '#world_editor_select') render(); });
    }
    console.log(LOG, 'loaded');
}

const { eventSource, event_types } = SillyTavern.getContext();
eventSource.on(event_types.APP_READY, () => { try { init(); } catch (e) { console.error(LOG, e); } });
