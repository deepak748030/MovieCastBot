const adminUsernames = ["knox7489", "vixcasm", "Knoxbros"];

function isAdmin(ctx) {
    return adminUsernames.includes(ctx.from.username);
}

module.exports = { isAdmin };