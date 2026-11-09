(function () {
  var sel = document.getElementById('langsel');
  if (!sel) return;
  sel.value = document.documentElement.getAttribute('data-lang') || 'en';
  sel.addEventListener('change', function () {
    var l = sel.value;
    document.documentElement.setAttribute('data-lang', l);
    document.documentElement.lang = l;
    try { localStorage.setItem('b1t-lang', l); } catch (e) {}
    try {
      var u = new URL(location.href);
      if (u.searchParams.has('lang')) { u.searchParams.set('lang', l); history.replaceState(null, '', u); }
    } catch (e) {}
  });
})();
