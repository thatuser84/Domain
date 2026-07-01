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

function appendMessage(role, content) {
  const wrap = document.createElement("div");
  wrap.className = `msg msg-${role}`;

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
  bubble.textContent = content;
  wrap.appendChild(bubble);

  messagesEl.appendChild(wrap);
  scrollToBottom();
  return bubble;
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
  const text = input.value.trim();
  if (!text) return;

  suggestionsEl.innerHTML = "";
  appendMessage("user", text);
  input.value = "";
  input.style.height = "auto";

  const typingBubble = appendMessage("assistant", "...");
  typingBubble.classList.add("typing");

  try {
    const res = await fetch(`/chat/${chatId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    typingBubble.classList.remove("typing");
    if (!res.ok) {
      typingBubble.textContent = `[error] ${data.error || "something broke"}`;
      typingBubble.parentElement.classList.add("msg-error");
    } else {
      typingBubble.textContent = data.reply;
      renderSuggestions(data.suggestions);
    }
  } catch (err) {
    typingBubble.classList.remove("typing");
    typingBubble.textContent = `[error] ${err.message}`;
    typingBubble.parentElement.classList.add("msg-error");
  }
  scrollToBottom();
});
