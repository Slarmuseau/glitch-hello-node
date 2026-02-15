/**
 * Holiday Packing App - Client-side JavaScript
 * Handles checklist interactions, adding items, tab switching, and progress tracking.
 */

(function () {
  "use strict";

  // ============ TAB SWITCHING ============

  var tabs = document.querySelectorAll(".tab");
  var tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var targetTab = this.getAttribute("data-tab");

      // Remove active from all tabs and contents
      tabs.forEach(function (t) {
        t.classList.remove("active");
      });
      tabContents.forEach(function (tc) {
        tc.classList.remove("active");
      });

      // Activate clicked tab
      this.classList.add("active");
      var targetContent = document.getElementById("tab-" + targetTab);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });

  // ============ CHECKBOX HANDLING ============

  function updateProgress() {
    var allCheckboxes = document.querySelectorAll(".item-check");
    var checkedBoxes = document.querySelectorAll(".item-check:checked");
    var total = allCheckboxes.length;
    var checked = checkedBoxes.length;

    // Update progress bar
    var progressBar = document.getElementById("progress-bar");
    var progressText = document.getElementById("progress-text");
    var progressCount = document.getElementById("progress-count");

    if (progressBar) {
      var pct = total > 0 ? (checked / total) * 100 : 0;
      progressBar.style.width = pct + "%";
    }
    if (progressText) {
      progressText.textContent = checked + " of " + total + " items packed";
    }
    if (progressCount) {
      progressCount.textContent = checked;
    }

    // Update per-category counts
    var categories = document.querySelectorAll(".category-section");
    categories.forEach(function (cat) {
      var catCheckboxes = cat.querySelectorAll(".item-check");
      var catChecked = cat.querySelectorAll(".item-check:checked");
      var countEl = cat.querySelector(".cat-checked");
      if (countEl) {
        countEl.textContent = catChecked.length;
      }
      // Update total count display
      var countSpan = cat.querySelector(".category-count");
      if (countSpan && !cat.querySelector("#custom-items-total")) {
        var totalInCat = catCheckboxes.length;
        countSpan.innerHTML =
          '<span class="cat-checked">' +
          catChecked.length +
          "</span>/" +
          totalInCat;
      }
    });

    // Save state to localStorage
    saveCheckState();
  }

  function setupCheckboxes() {
    var checkboxes = document.querySelectorAll(".item-check");
    checkboxes.forEach(function (cb) {
      cb.addEventListener("change", function () {
        var li = this.closest(".packing-item");
        if (li) {
          if (this.checked) {
            li.classList.add("checked");
          } else {
            li.classList.remove("checked");
          }
        }
        updateProgress();
      });
    });

    // Document checkboxes
    var docCheckboxes = document.querySelectorAll(".doc-check");
    docCheckboxes.forEach(function (cb) {
      cb.addEventListener("change", function () {
        var li = this.closest(".document-item");
        if (li) {
          if (this.checked) {
            li.classList.add("checked");
          } else {
            li.classList.remove("checked");
          }
        }
      });
    });
  }

  // ============ REMOVE ITEMS ============

  function setupRemoveButtons() {
    document.addEventListener("click", function (e) {
      if (e.target.classList.contains("btn-remove")) {
        var li = e.target.closest(".packing-item");
        if (li) {
          var itemName = li.querySelector(".item-name");
          if (itemName) {
            // If user is logged in and this is a saved item, remove from server
            if (
              USERNAME &&
              li.closest(".category-section") &&
              li.closest("[data-category='Your Saved Items']")
            ) {
              removeSavedItem(itemName.textContent.trim());
            }
          }
          li.remove();
          updateProgress();
        }
      }
    });
  }

  function removeSavedItem(itemName) {
    fetch("/api/remove-saved-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemName: itemName, username: USERNAME }),
    }).catch(function (err) {
      console.error("Failed to remove saved item:", err);
    });
  }

  // ============ ADD CUSTOM ITEMS ============

  function setupAddItem() {
    var addBtn = document.getElementById("add-item-btn");
    var input = document.getElementById("custom-item-input");

    if (!addBtn || !input) return;

    function addItem() {
      var name = input.value.trim();
      if (!name) return;

      // Show custom items section
      var section = document.getElementById("custom-items-section");
      var list = document.getElementById("custom-items-list");
      var totalSpan = document.getElementById("custom-items-total");

      if (section) section.style.display = "";

      // Create new list item
      var li = document.createElement("li");
      li.className = "packing-item";
      li.setAttribute("data-category", "Custom Items");
      li.innerHTML =
        '<label class="check-label">' +
        '<input type="checkbox" class="item-check" />' +
        '<span class="checkmark"></span>' +
        '<span class="item-name">' +
        escapeHtml(name) +
        "</span>" +
        "</label>" +
        '<button class="btn-remove" title="Remove item">&times;</button>';

      list.appendChild(li);

      // Setup checkbox for new item
      var newCb = li.querySelector(".item-check");
      newCb.addEventListener("change", function () {
        if (this.checked) {
          li.classList.add("checked");
        } else {
          li.classList.remove("checked");
        }
        updateProgress();
      });

      // Update count
      if (totalSpan) {
        var count = list.querySelectorAll(".packing-item").length;
        totalSpan.textContent = count;
      }

      // Save to server if username is provided
      if (typeof USERNAME !== "undefined" && USERNAME) {
        fetch("/api/add-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemName: name, username: USERNAME }),
        }).catch(function (err) {
          console.error("Failed to save item:", err);
        });
      }

      input.value = "";
      updateProgress();
      input.focus();
    }

    addBtn.addEventListener("click", addItem);
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem();
      }
    });
  }

  // ============ LOCAL STORAGE FOR CHECK STATE ============

  function getStorageKey() {
    return "packing-check-state-" + window.location.pathname;
  }

  function saveCheckState() {
    var state = {};
    var items = document.querySelectorAll(".packing-item");
    items.forEach(function (item, index) {
      var cb = item.querySelector(".item-check");
      if (cb) {
        var name = item.querySelector(".item-name");
        var key = name ? name.textContent.trim() : "item-" + index;
        state[key] = cb.checked;
      }
    });

    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(state));
    } catch (e) {
      // localStorage may not be available
    }
  }

  function restoreCheckState() {
    try {
      var stored = localStorage.getItem(getStorageKey());
      if (!stored) return;

      var state = JSON.parse(stored);
      var items = document.querySelectorAll(".packing-item");
      items.forEach(function (item, index) {
        var cb = item.querySelector(".item-check");
        if (cb) {
          var name = item.querySelector(".item-name");
          var key = name ? name.textContent.trim() : "item-" + index;
          if (state[key] === true) {
            cb.checked = true;
            item.classList.add("checked");
          }
        }
      });
    } catch (e) {
      // ignore errors
    }
  }

  // ============ HELPERS ============

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============ INIT ============

  function init() {
    setupCheckboxes();
    setupRemoveButtons();
    setupAddItem();
    restoreCheckState();
    updateProgress();
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
