const messagesEl = document.getElementById("messages");
const composer = document.getElementById("composer");
const input = document.getElementById("input");
const suggestionsEl = document.getElementById("suggestions");

function renderSuggestions(options) {
  suggestionsEl.innerHTML = "";
  if (!options || !options.length) return;
  options.forEach((text) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = text;
    // Fills the composer rather than auto-sending — the free-text box is still right there to
    // edit it or ignore it and type something else entirely.
    chip.addEventListener("click", () => {
      input.value = text;
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      input.focus();
      suggestionsEl.innerHTML = "";
    });
    suggestionsEl.appendChild(chip);
  });
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
scrollToBottom();

function makeRegenButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "regen-btn";
  btn.title = "regenerate this reply";
  btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
  return btn;
}

function appendMessage(role, content, isOoc) {
  const wrap = document.createElement("div");
  wrap.className = `msg msg-${role}${isOoc ? " msg-ooc" : ""}`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    if (characterAvatarUrl) {
      const img = document.createElement("img");
      img.src = characterAvatarUrl;
      img.alt = "";
      avatar.appendChild(img);
    } else {
      avatar.textContent = characterAvatar;
    }
    wrap.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  if (isOoc) {
    const tag = document.createElement("span");
    tag.className = "ooc-tag";
    tag.textContent = "ooc";
    bubble.appendChild(tag);
  }
  bubble.appendChild(document.createTextNode(content));
  wrap.appendChild(bubble);

  messagesEl.appendChild(wrap);
  scrollToBottom();
  return bubble;
}

function setBubbleContent(bubble, content, isOoc, isError) {
  bubble.innerHTML = "";
  if (isOoc) {
    const tag = document.createElement("span");
    tag.className = "ooc-tag";
    tag.textContent = "ooc";
    bubble.appendChild(tag);
    bubble.parentElement.classList.add("msg-ooc");
  }
  bubble.appendChild(document.createTextNode(content));
  if (!isError) bubble.appendChild(makeRegenButton());
}

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawText = input.value.trim();
  if (!rawText) return;

  const isOoc = rawText.startsWith("/");
  const text = isOoc ? rawText.slice(1).trim() : rawText;
  if (!text) return;

  suggestionsEl.innerHTML = "";
  appendMessage("user", text, isOoc);
  input.value = "";
  input.style.height = "auto";

  const typingBubble = appendMessage("assistant", "...", isOoc);
  typingBubble.classList.add("typing");

  try {
    const res = await fetch(`/chat/${chatId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: rawText }),
    });
    const data = await res.json();
    typingBubble.classList.remove("typing");
    if (!res.ok) {
      setBubbleContent(typingBubble, `[error] ${data.error || "something broke"}`, false, true);
      typingBubble.parentElement.classList.add("msg-error");
    } else {
      setBubbleContent(typingBubble, data.reply, data.ooc, false);
      renderSuggestions(data.suggestions);
    }
  } catch (err) {
    typingBubble.classList.remove("typing");
    setBubbleContent(typingBubble, `[error] ${err.message}`, false, true);
    typingBubble.parentElement.classList.add("msg-error");
  }
  scrollToBottom();
});

// Only ever fires from the last assistant message — CSS only shows .regen-btn on
// .msg-assistant:last-child, so there's nothing to guard against re-triggering elsewhere.
messagesEl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".regen-btn");
  if (!btn) return;

  const bubble = btn.closest(".msg-bubble");
  suggestionsEl.innerHTML = "";
  bubble.classList.add("typing");
  btn.disabled = true;

  try {
    const res = await fetch(`/chat/${chatId}/regenerate`, { method: "POST" });
    const data = await res.json();
    bubble.classList.remove("typing");
    if (!res.ok) {
      setBubbleContent(bubble, `[error] ${data.error || "something broke"}`, false, true);
      bubble.parentElement.classList.add("msg-error");
    } else {
      setBubbleContent(bubble, data.reply, data.ooc, false);
      renderSuggestions(data.suggestions);
    }
  } catch (err) {
    bubble.classList.remove("typing");
    setBubbleContent(bubble, `[error] ${err.message}`, false, true);
    bubble.parentElement.classList.add("msg-error");
  }
  scrollToBottom();
});
