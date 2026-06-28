(() => {
  const scriptUrl = new URL(document.currentScript.src);
  const catalogUrl = new URL("tracks.json", scriptUrl);
  catalogUrl.search = scriptUrl.search;

  fetch(catalogUrl)
    .then(response => {
      if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
      return response.json();
    })
    .then(catalog => {
      window.JMT_CATALOG = catalog;
      dispatchEvent(new CustomEvent("jmt:catalog-ready", { detail: catalog }));
    })
    .catch(error => {
      console.error("Unable to load the JMT Music catalog.", error);
    });
})();
