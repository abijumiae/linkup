export const THEME_STORAGE_KEY = "linkup-theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=document.documentElement;if(t==="light"){d.classList.remove("dark");}else{d.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;
