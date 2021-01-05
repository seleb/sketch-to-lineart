console.log('packing textures...');
let texturePacker = require('free-tex-packer-core');
const fs = require('fs');

const dir = './asset source files/textures';
const images = fs.readdirSync(dir).map(i => ({
	path: `${dir}/${i}`,
	contents: fs.readFileSync(`${dir}/${i}`),
}));

texturePacker(
	images,
	{
		textureName: 'textures',
		fixedSize: false,
		padding: 1,
		allowRotation: false,
		detectIdentical: true,
		allowTrim: false,
		exporter: 'Pixi',
		removeFileExtension: false,
		prependFolderName: false,
	},
	(files, error) => {
		if (error) {
			console.error('Packaging failed', error);
			return;
		}
		fs.writeFileSync(`./static/assets/${files[0].name}`, files[0].buffer);
		fs.writeFileSync(`./static/assets/${files[1].name}`, files[1].buffer);
		console.log('textures packed ✔');
	}
);
