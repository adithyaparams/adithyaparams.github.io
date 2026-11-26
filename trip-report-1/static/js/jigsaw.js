/* jigsaw.js
 * Eric Zheng <ericzheng@cmu.edu>
 */

const Jigsaw = (function() {
  function lazy_seq(iterator) {
    function* map(iterator, fn) {
      for (let i of iterator)
        yield fn(i);
    }

    function* filter(iterator, fn) {
      for (let i of iterator) {
        if (fn(i))
          yield i;
      }
    }

    function reduce(iterator, fn) {
      let result = iterator.next().value;
      for (let i of iterator)
        result = fn(result, i);
      return result;
    }

    return {
      next: () => iterator.next(),
      map: fn => lazy_seq(map(iterator, fn)),
      filter: fn => lazy_seq(filter(iterator, fn)),
      reduce: fn => reduce(iterator, fn)
    }
  }

  // The default objective function minimizes the total squared
  // deviation from 1/4 height for each row (i.e. three 4:3 landscape
  // photos per row is "ideal," ignoring margins).
  // TODO: maybe make objective to minimize squared distance from three
  // per row taking the average aspect ratio?
  function default_objective(rows) {
    const ideal_height = 0.25;
    return rows
      .map(row => Math.pow(row.height - ideal_height, 2))
      .reduce((x, y) => x + y);
  }

  // Slightly unorthodox: aspect ratios are height : width.
  function make_row(aspect_ratios, margin) {
    if (aspect_ratios.length === 0)
      return [];

    const a1 = aspect_ratios[0];
    const coefficient_sum =
      aspect_ratios
        .map(a => a1 / a)
        .reduce((x, y) => x + y);

    const x1 = (1.0 - (aspect_ratios.length + 1) * margin) / coefficient_sum;
    return {
      'height': a1 * x1,
      'aspect_ratios': aspect_ratios,
      'scale_factors': aspect_ratios.map(a => a1 * x1 / a)
    }
  }

  function make_rows(splits, margin) {
    return splits.map(segment => make_row(segment, margin));
  }

  function subsets(array) {
    function *generator() {
      const upper = 1 << array.length;
      for (let i = 0; i < upper; i++) {
        const str = i.toString(2).padStart(array.length);
        yield array.filter((_, idx) => str[idx] === '1');
      }
    }
    return lazy_seq(generator());
  }

  function all_splits(items) {
    const all_indices = [...Array(items.length).keys()].slice(1);
    return subsets(all_indices).map(indices => {
      const splits = [0, ...indices, items.length];
      return splits.slice(1).map((hi, idx) => items.slice(splits[idx], hi));
    });
  }

  function scale_images(aspect_ratios, margin, objective = default_objective) {
    // For now, try each of the 2^(n-1) ways to split into rows.
    return all_splits(aspect_ratios)
      .map(splits => make_rows(splits, margin))
      .map(rows => {return {'rows': rows, 'value': objective(rows)}})
      .reduce((x, y) => x.value < y.value ? x : y)
      .rows;
  }

  // TODO: May need to fix margin by separately setting margin-top, etc.
  // for edges
  function draw(aspect_ratios, margin_abs, target) {
    scale_images(aspect_ratios, margin_abs / target.offsetWidth)
      .forEach(row => {
        row.scale_factors
          .forEach((scale, idx) => {
            const width = scale * target.offsetWidth;
            const aspect_ratio = row.aspect_ratios[idx];
            const box = document.createElement('div');
            box.style.backgroundColor = 'red';
            box.style.width = `${width}px`;
            box.style.height = `${width * aspect_ratio}px`;
            box.style.display = 'inline-block';
            box.style.margin = `${margin_abs / 2}px`;
            box.style.lineHeight = '1em';
            box.textContent = aspect_ratio.toFixed(2);
            target.appendChild(box);
          });
      });
  }

  function layout(images, target_width, margin_abs = 5) {
    const aspect_ratios = Array.from(images)
      .map(image => (image.videoHeight || image.naturalHeight) / (image.videoWidth || image.naturalWidth));

    let index = 0;
    scale_images(aspect_ratios, margin_abs / target_width)
      .forEach(row => {
        // Keep fractional CSS widths and a shared row height; the integer
        // HTML width attribute previously introduced small height differences.
        row.scale_factors.forEach(scale => {
          const image = images[index++];
          image.style.width = `${scale * target_width}px`;
          image.style.height = `${row.height * target_width}px`;
          image.style.verticalAlign = 'top';
          image.style.margin = `${0.5 * margin_abs}px`;
        });
      });
  }

  return {
    scale_images: scale_images,
    draw: draw,
    layout: layout
  }
  })();
