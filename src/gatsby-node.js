const svgToMiniDataURI = require('mini-svg-data-uri');
const SVGO = require('svgo');

let svgo;

// eslint-disable-next-line no-unused-vars
exports.onPreBootstrap = (_, pluginOptions) => {
  svgo = new SVGO({
    full: true,
    plugins: [{ inlineStyles: { onlyMatchedOnce: false } }]
  });
}

const parseSvg = async svg => {
  // Optimize
  if (svg.indexOf('base64') !== -1) {
    console.log(
      'SVG contains pixel data. Pixel data was removed to avoid file size bloat.'
    );
  }
  const { data: content } = await svgo.optimize(svg);

  // Create mini data URI
  const dataURI = svgToMiniDataURI(content);

  return {
    content,
    originalContent: svg,
    parsed: 'inlineSVG',
    dataURI
  };
};

async function onCreateNode(
  {
    node,
    actions: { createNode, createParentChildLink },
    loadNodeContent,
    createNodeId,
    createContentDigest
  },
  // eslint-disable-next-line no-unused-vars
  pluginOptions
) {
  function transformObject(obj, id, type) {
    const svgNode = {
      ...obj,
      id,
      children: [],
      parent: node.id,
      internal: {
        contentDigest: createContentDigest(obj),
        type
      }
    };
    createNode(svgNode);
    createParentChildLink({ parent: node, child: svgNode });
  }

  // We only care about JSON content.
  if (node.internal.mediaType !== `image/svg+xml`) {
    return;
  }

  const content = await loadNodeContent(node);
  const parsedContent = await parseSvg(content);
  transformObject(
    parsedContent,
    parsedContent.id
      ? String(parsedContent.id)
      : createNodeId(`${node.id} >>> SVG`),
    'SVG'
  );
}

exports.onCreateNode = onCreateNode;
