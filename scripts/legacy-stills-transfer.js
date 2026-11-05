/* Runs inside the pinned CTK iframe, sharing its original Storyboard/Filmstrip engines. */
(() => {
  'use strict';
  const respond = (requestId, details) => window.parent.postMessage({
    source: 'the-forge-bridge', type: 'transfer-result', requestId, ...details,
  }, location.origin);

  function validateGroups(raw) {
    if (!Array.isArray(raw) || raw.length > 100) throw Error('Invalid video collections');
    return raw.map(group => {
      if (typeof group.id !== 'string' || typeof group.name !== 'string' || !Array.isArray(group.frames) || group.frames.length > 100_000) {
        throw Error('Invalid video collection');
      }
      return { id: group.id.slice(0, 200), name: group.name.slice(0, 150), frames: group.frames.map(frame => {
        if (!Number.isInteger(frame.num) || frame.num < 1 || !(frame.blob instanceof Blob) || frame.blob.size < 1) throw Error('Invalid video frame');
        return { num: frame.num, blob: frame.blob };
      }) };
    }).filter(group => group.frames.length);
  }

  async function loadImage(blob, owner) {
    const url = Core.BlobRegistry.create(blob, owner);
    const img = new Image();
    const success = await new Promise(resolve => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    if (!success) { Core.BlobRegistry.release(url); return null; }
    return { img, url };
  }

  async function importBoards(groups) {
    const story = Tools.Story;
    if (!story || typeof story.makeProject !== 'function') throw Error('Storyboard is unavailable.');
    if (story.active) story.saveSettings();
    let imported = 0, created = 0, rejected = 0, firstId = null;
    for (const group of groups) {
      let target = story.projects.find(p => p.stillsSourceId === group.id);
      const missing = group.frames.filter(frame => !target?.images.some(item =>
        item.stillsSourceId === group.id && item.stillsFrameNum === frame.num));
      if (!missing.length) continue;
      let newBoard = false;
      if (!target) {
        const blank = story.active && story.active.images.length === 0 &&
          /^Board_\d+$/.test(story.active.name) && !story.active.stillsSourceId;
        target = blank ? story.active : story.makeProject(story.uniqueBoardName(group.name));
        target.stillsSourceId = group.id;
        target.name = story.uniqueBoardName(group.name, target);
        if (target === story.active && story.els?.name) story.els.name.value = target.name;
        newBoard = true;
      }
      const before = target.images.length;
      for (const frame of missing) {
        const loaded = await loadImage(frame.blob, 'story');
        if (!loaded || !story.validateImage(loaded.img)) {
          if (loaded) Core.BlobRegistry.release(loaded.url);
          rejected++;
          continue;
        }
        target.images.push({
          file: frame.blob, img: loaded.img,
          label: `${group.name} #${frame.num}`,
          stillsSourceId: group.id, stillsFrameNum: frame.num,
        });
        imported++;
      }
      if (target.images.length > before) {
        story.applyDefaultColumns?.(target);
        if (newBoard) created++;
        if (firstId === null) firstId = target.id;
      } else if (newBoard) {
        target.stillsSourceId = null;
        if (target !== story.active) story.projects.splice(story.projects.indexOf(target), 1);
      }
    }
    if (firstId !== null) story.switchProject(firstId);
    UI._openTool('section-stills-boards', 'story');
    return { imported, created, rejected, mode: 'story' };
  }

  async function importFilmstrip(groups) {
    const filmstrip = Tools.Filmstrip;
    if (!filmstrip || typeof filmstrip.addFromStills !== 'function') throw Error('Filmstrip is unavailable.');
    const loaded = [];
    try {
      for (const group of groups) for (const frame of group.frames) {
        loaded.push({ num: frame.num, name: `${group.name} #${frame.num}`,
          url: Core.BlobRegistry.create(frame.blob, 'filmstrip') });
      }
      const before = filmstrip.images.length;
      await filmstrip.addFromStills(loaded);
      const kept = new Set(filmstrip.images.map(item => item.img?.src));
      let imported = 0;
      for (const item of loaded) {
        if (kept.has(item.url)) {
          const saved = filmstrip.images.find(img => img.img?.src === item.url);
          if (saved) saved.owned = true;
          imported++;
        } else Core.BlobRegistry.release(item.url);
      }
      UI._openTool('section-stills-boards', 'filmstrip');
      return { imported, rejected: loaded.length - imported, created: 0, mode: 'filmstrip', before };
    } catch (cause) {
      const kept = new Set(filmstrip.images.map(item => item.img?.src));
      for (const item of loaded) if (!kept.has(item.url)) Core.BlobRegistry.release(item.url);
      throw cause;
    }
  }

  window.addEventListener('message', async event => {
    if (event.source !== window.parent || event.origin !== location.origin ||
        event.data?.source !== 'the-forge-shell' || event.data.type !== 'transfer-stills') return;
    const { requestId, destination } = event.data;
    if (typeof requestId !== 'string' || requestId.length > 150) return;
    try {
      const groups = validateGroups(event.data.groups);
      if (!groups.length) throw Error('Select at least one still');
      if (destination !== 'board' && destination !== 'filmstrip') throw Error('Unknown destination');
      const result = destination === 'board' ? await importBoards(groups) : await importFilmstrip(groups);
      respond(requestId, { ok: true, ...result });
    } catch (cause) {
      respond(requestId, { ok: false, message: cause instanceof Error ? cause.message : String(cause) });
    }
  });
})();
