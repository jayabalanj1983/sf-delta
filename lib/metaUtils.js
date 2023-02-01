const xmlBuilder = require('xmlbuilder');
const fs = require('fs-extra');
const mkdirp = require('mkdirp');
const klaw = require('klaw');

/**
 * Mapping of file name to Metadata Definition
 */
// @todo -- finish out all the different metadata types
const metaMap = {
	'applications': 'CustomApplication',
	'appMenus': 'AppMenu',
	'approvalProcesses': 'ApprovalProcess',
	'assignmentRules': 'AssignmentRules',
	'aura': 'AuraDefinitionBundle',
	'authproviders': 'AuthProvider',
	'autoResponseRules': 'AutoResponseRules',
	'classes': 'ApexClass',
	'communities': 'Community',
	'components': 'ApexComponent',
	'connectedApps': 'ConnectedApp',
	'customPermissions': 'CustomPermission',
	'customMetadata': 'CustomMetadata',
	'dashboards': 'Dashboard',
	'documents': 'Document',
	'email': 'EmailTemplate',
	'escalationRules': 'EscalationRules',
	'flexipages': 'FlexiPage',
	'flowDefinitions': 'FlowDefinition',
	'flows': 'Flow',
	'groups': 'Group',
	'homePageComponents': 'HomePageComponent',
	'homePageLayouts': 'HomePageLayout',
	'installedPackages': 'InstalledPackage',
	'labels': 'CustomLabels',
	'layouts': 'Layout',
	'letterhead': 'Letterhead',
	'lwc': 'LightningComponentBundle',
	'managedTopics': 'ManagedTopics',
	'matchingRules': 'MatchingRule',
	'namedCredentials': 'NamedCredential',
	'networks': 'Network',
	'objects': 'CustomObject',
	'objectTranslations': 'CustomObjectTranslation',
	'pages': 'ApexPage',
	'pathAssistants': 'PathAssistant',
	'permissionsets': 'PermissionSet',
	'profiles': 'Profile',
	'queues': 'Queue',
	'quickActions': 'QuickAction',
	'remoteSiteSettings': 'RemoteSiteSetting',
	'reports': 'Report',
	'reportTypes': 'ReportType',
	'roles': 'Role',
	'staticresources': 'StaticResource',
	'triggers': 'ApexTrigger',
	'tabs': 'CustomTab',
	'sharingRules': 'SharingRules',
	'sharingSets': 'SharingSet',
	'siteDotComSites': 'SiteDotCom',
	'sites': 'CustomSite',
	'standardValueSets': 'StandardValueSet',
	'workflows': 'Workflow',
	'weblinks': 'CustomPageWebLink',
	

};

exports.packageWriter = function(metadata, apiVersion) {
	apiVersion = apiVersion || '37.0';
	const xml = xmlBuilder.create('Package', { version: '1.0'});
	xml.att('xmlns', 'http://soap.sforce.com/2006/04/metadata');

	for (const type in metadata) {

		if (metadata.hasOwnProperty(type)) {
			const typeXml = xml.ele('types');
			metadata[type].forEach(function(item) {
				typeXml.ele('members', item);
			});

			typeXml.ele('name', metaMap[type]);
		}
	}
	xml.ele('version', apiVersion);

	return xml.end({pretty: true});
};

exports.buildPackageDir = function (dirName, name, metadata, packgeXML, destructive, cb) {

	let packageDir;
	let packageFileName;
	if (destructive) {
		packageDir = dirName + '/destructive';
		packageFileName = '/destructiveChanges.xml';
	} else {
		packageDir = dirName + '/unpackaged';
		//packageDir = dirName ;
		packageFileName = '/package.xml';
	}

	// @todo -- should probably validate this a bit
	mkdirp(packageDir, (err) => {
		if(err) {
			return cb('Failed to write package directory ' + packageDir);
		}

		fs.writeFile(packageDir + packageFileName, packgeXML, 'utf8', (err) => {
			if(err) {
				return cb('Failed to write xml file');
			}

			return cb(null, packageDir);
		});

	});
};

exports.copyFiles = function(sourceDir, buildDir, files) {
    sourceDir = sourceDir + '/';
    buildDir = buildDir + '/';

    files.forEach(function(file) {
        if(file) {
			const parts = file.split('/');
			let lightning = false;
			if (parts.length === 4) {
				if(parts[1].includes("lwc") || parts[1].includes("aura")){
					lightning = true;
				} 
			}
			const lightninPath =  parts[0] + '/' + parts[1] + '/' + parts[2];
			if(lightning){
				const items = [];
				klaw(lightninPath).on('data', item => {
					const filePath = item.path.split('src');
					items.push('src'+filePath[1]);
				}).on('end', () => {
					let i = 0;
					items.forEach(function(item) {
						if(i != 0) {
							fs.copySync(sourceDir + item, buildDir + item.substr(4, item.length));
						}
						i++;
					});			
				});
			} else {
				fs.copySync(sourceDir + file, buildDir + file.substr(4, file.length));
				
				//console.log('fie--->' + sourceDir + '--->' + buildDir + '---->' + file);
				if(file.endsWith('-meta.xml')) {
					const nonMeta = file.replace('-meta.xml', '');
					fs.copySync(sourceDir + nonMeta, buildDir + nonMeta.substr(4, nonMeta.length));
				} else {
					let metaExists = true;
					try {
						fs.accessSync(sourceDir + file + '-meta.xml', fs.F_OK);
					}
					catch (err) {
						console.log('does not exist');
						metaExists = false;
					}

					if(metaExists) {
						const meta = file + '-meta.xml';
						fs.copySync(sourceDir + meta, buildDir + meta.substr(4, meta.length));
					}
				}
			}
			
        }
    });
};
