export const now = () => Date.now();
export const short = (s, l = 100) => {
    if (!s)
        return '';
    return s.length > l ? s.slice(0, l) + '...' : s;
};
export const jidToNumber = (jid) => {
    return jid.split('@')[0];
};
//# sourceMappingURL=helpers.js.map