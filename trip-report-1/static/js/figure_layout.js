/* figure_layout.js
 * Eric Zheng <ericzheng@cmu.edu>
 *
 * Requires that jigsaw.js be loaded first. See
 * https://github.com/air-wreck/jigsaw.
 */

// Returns both the actual image objects (for layout) and any wrapper
// anchors (so that they can be placed in a container).
function get_images(figure) {
  const images = [];
  const parents = []

  for (let child of figure.children) {
    const tag = child.tagName.toUpperCase();
    if (tag === 'IMG') {
      parents.push(child);
      images.push(child);
    } else if (tag === 'DIV' && child.classList.contains('gallery-video')) {
      const video = child.querySelector('video');
      if (video) { child.replaceChildren(video); parents.push(child); images.push(video); }
    } else if (tag === 'A') {
      const child_images = child.getElementsByTagName('img');
      if (child_images.length > 0) {
        parents.push(child);
        images.push(child_images[0]);
      }
    }
  }

  return [images, parents];
}

window.addEventListener('load', async () => {
  await Promise.all(Array.from(document.querySelectorAll('.gallery video')).map(video => {
    if (video.readyState >= 1 || video.error) return Promise.resolve();
    return new Promise(resolve => {
      video.addEventListener('loadedmetadata', resolve, {once: true});
      video.addEventListener('error', resolve, {once: true});
    });
  }));
  const figures = [];
  const galleries = document.getElementsByClassName('gallery');
  for (let gallery of galleries) {
    const container = document.createElement('div');
    const [images, parents] = get_images(gallery);
    if (!images.length) continue;
    parents.forEach(parent => {
      gallery.removeChild(parent);
      container.appendChild(parent);
    });

    gallery.insertBefore(container, gallery.firstChild);
    // An explicit single row scales each image without cropping or wrapping.
    if (gallery.classList.contains('gallery-single-row')) {
      container.style.display = 'flex';
      container.style.gap = '5px';
      container.style.alignItems = 'flex-start';
      const ratios = images.map(image => (image.videoWidth || image.naturalWidth) / (image.videoHeight || image.naturalHeight) || 1);
      // Fit within the article, but keep the row at most 220px tall.
      container.style.maxWidth = `${220 * ratios.reduce((sum, ratio) => sum + ratio, 0) + 5 * (images.length - 1)}px`;
      container.style.marginInline = 'auto';
      images.forEach((image, index) => {
        const ratio = (image.videoWidth || image.naturalWidth) / (image.videoHeight || image.naturalHeight) || 1;
        parents[index].style.flex = `${ratio} 1 0%`;
        parents[index].style.minWidth = '0';
        image.style.width = '100%';
        image.style.maxWidth = '100%';
        image.style.height = 'auto';
        image.style.display = 'block';
      });
      const sizeRow = () => {
        const height = Math.max(0, (container.clientWidth - 5 * (images.length - 1)) / ratios.reduce((sum, ratio) => sum + ratio, 0));
        images.forEach(media => { media.style.height = `${height}px`; media.style.objectFit = 'contain'; });
      };
      sizeRow();
      new ResizeObserver(sizeRow).observe(container);
      continue;
    }
    // Video wrappers must share the same inline row as photo links.
    parents.forEach(parent => {
      if (parent.classList.contains('gallery-video')) {
        parent.style.display = 'inline-block';
        parent.style.verticalAlign = 'top';
      }
    });
    images.forEach(media => { media.style.maxHeight = 'none'; });
    const target_width = container.offsetWidth;

    Jigsaw.layout(images, target_width);
    images.forEach(image => image.style.maxWidth = '100%');
    container.style.lineHeight = '0px';
    container.style.fontSize = '0px'; // Ignore whitespace between photo links.
    figures.push([images, container]);
  }

  // Make sure to redo layout after each resize.
  window.addEventListener('resize', () => {
    for (let [images, container] of figures)
      Jigsaw.layout(images, container.offsetWidth);
  });
});
