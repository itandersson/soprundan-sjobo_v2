import { translate } from './i18n.js'

/**
 * This SCHEMA defines metadata about properties.
 *
 * This is here in order to have a centered place where all properties are specified.
 *
 * Each property defines:
 *
 * - `type`:        The type of the data
 * - `impacts`:     A list of impacts than happen when this property is updated, among
 *                  'ui', 'data', 'limit-bounds', 'datalayer-index', 'remote-data',
 *                  'background' 'sync'.
 * - `belongsTo`:   A list of conceptual objects this property belongs to, among
 *                  'map', 'feature', 'datalayer'.
 *
 * - Extra keys are being passed to the FormBuilder automatically.
 */

// This is sorted alphabetically
export const SCHEMA = {
  browsable: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['datalayer'],
  },
  captionBar: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Do you want to display a caption bar?'),
    default: false,
  },
  captionControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the caption control'),
    default: true,
  },
  captionMenus: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Do you want to display caption menus?'),
    default: true,
  },
  color: {
    type: String,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    handler: 'ColorPicker',
    label: translate('color'),
    helpEntries: 'colorValue',
    inheritable: true,
    default: 'DarkBlue',
  },
  choropleth: {
    type: Object,
    impacts: ['data'],
    belongsTo: ['datalayer'],
  },
  cluster: {
    type: Object,
    impacts: ['data'],
    belongsTo: ['datalayer'],
  },
  dashArray: {
    type: String,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer'],
    label: translate('dash array'),
    helpEntries: 'dashArray',
    inheritable: true,
  },
  datalayersControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    handler: 'DataLayersControl',
    label: translate('Display the data layers control'),
    default: true,
  },
  defaultView: {
    type: String,
    impacts: [], // no need to update the ui, only useful when loading the map
    belongsTo: ['map'],
    label: translate('Default view'),
    choices: [
      ['center', translate('Saved center and zoom')],
      ['data', translate('Fit all data')],
      ['latest', translate('Latest feature')],
      ['locate', translate('User location')],
    ],
    default: 'center',
  },
  description: {
    type: 'Text',
    impacts: ['ui'],
    belongsTo: ['map', 'datalayer'],
    label: translate('description'),
    helpEntries: 'textFormatting',
  },
  displayOnLoad: {
    type: Boolean,
    impacts: [],
    belongsTo: ['datalayer'], // XXX ?
  },
  displayPopupFooter: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'], // XXX ?
    label: translate('Do you want to display popup footer?'),
    default: false,
  },
  easing: {
    type: Boolean,
    impacts: [],
    belongsTo: ['feature'], // XXX ?
    default: false,
  },
  editinosmControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the control to open OpenStreetMap editor'),
    default: null,
  },
  embedControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the embed control'),
    default: true,
  },
  facetKey: {
    type: String,
    impacts: ['ui'],
    belongsTo: ['datalayer'],
  },
  fill: {
    type: Boolean,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('fill'),
    helpEntries: 'fill',
    inheritable: true,
    default: true,
  },
  fillColor: {
    type: String,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    handler: 'ColorPicker',
    label: translate('fill color'),
    helpEntries: 'fillColor',
    inheritable: true,
  },
  fillOpacity: {
    type: Number,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    min: 0.1,
    max: 1,
    step: 0.1,
    label: translate('fill opacity'),
    inheritable: true,
    default: 0.3,
  },
  filterKey: {
    type: String,
    impacts: [],
    belongsTo: ['map', 'datalayer', 'feature'], // XXX ?
  },
  fromZoom: {
    type: Number,
    impacts: [], // not needed
    belongsTo: ['map'], // XXX ?
    label: translate('From zoom'),
    helpText: translate('Optional.'),
  },
  fullscreenControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the fullscreen control'),
    default: true,
  },
  heat: {
    type: Object,
    impacts: ['data'],
    belongsTo: ['datalayer'],
  },
  iconClass: {
    type: String,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('Icon shape'),
    inheritable: true,
    choices: [
      ['Default', translate('Default')],
      ['Circle', translate('Circle')],
      ['Drop', translate('Drop')],
      ['Ball', translate('Ball')],
    ],
    default: 'Default',
  },
  iconOpacity: {
    type: Number,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    min: 0.1,
    max: 1,
    step: 0.1,
    label: translate('icon opacity'),
    inheritable: true,
    default: 1,
  },
  iconUrl: {
    type: String,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    handler: 'IconUrl',
    label: translate('Icon symbol'),
    inheritable: true,
  },
  inCaption: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: [], // XXX ?
  },
  interactive: {
    type: Boolean,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('Allow interactions'),
    helpEntries: 'interactive',
    inheritable: true,
    default: true,
  },
  labelDirection: {
    type: String,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('Label direction'),
    inheritable: true,
    choices: [
      ['auto', translate('Automatic')],
      ['left', translate('On the left')],
      ['right', translate('On the right')],
      ['top', translate('On the top')],
      ['bottom', translate('On the bottom')],
    ],
    default: 'auto',
  },
  labelInteractive: {
    type: Boolean,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('Labels are clickable'),
    inheritable: true,
  },
  labelKey: {
    type: String,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'], // XXX ?
    helpEntries: 'labelKey',
    placeholder: translate('Default: name'),
    label: translate('Label key'),
    inheritable: true,
  },
  licence: {
    type: String,
    impacts: ['ui'],
    belongsTo: ['map', 'datalayer'], // XXX ?
    label: translate('licence'),
  },
  limitBounds: {
    type: Object,
    impacts: ['limit-bounds'],
    belongsTo: ['map'],
  },
  locateControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the locate control'),
  },
  longCredit: {
    type: 'Text',
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Long credits'),
    helpEntries: ['longCredit', 'textFormatting'],
  },
  measureControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the measure control'),
  },
  miniMap: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Do you want to display a minimap?'),
    default: false,
  },
  moreControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Do you want to display the «more» control?'),
    default: true,
  },
  name: {
    type: String,
    impacts: ['ui', 'data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('name'),
  },
  onLoadPanel: {
    type: String,
    impacts: [], // This is what happens during the map instantiation
    belongsTo: ['map'],
    label: translate('Do you want to display a panel on load?'),
    choices: [
      ['none', translate('None')],
      ['caption', translate('Caption')],
      ['databrowser', translate('Browser in data mode')],
      ['datalayers', translate('Browser in layers mode')],
      ['datafilters', translate('Browser in filters mode')],
    ],
    default: 'none',
  },
  opacity: {
    type: Number,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    min: 0.1,
    max: 1,
    step: 0.1,
    label: translate('opacity'),
    inheritable: true,
    default: 0.5,
  },
  outlink: {
    type: String,
    impacts: ['data'],
    belongsTo: ['feature'],
    label: translate('Link to…'),
    helpEntries: 'outlink',
    placeholder: 'http://...',
    inheritable: true,
  },
  outlinkTarget: {
    type: String,
    impacts: ['data'],
    belongsTo: ['feature'],
    label: translate('Open link in…'),
    inheritable: true,
    default: 'blank',
    choices: [
      ['blank', translate('new window')],
      ['self', translate('iframe')],
      ['parent', translate('parent window')],
    ],
  },
  overlay: {
    type: Object,
    impacts: ['background'],
    belongsTo: ['map'],
  },
  permanentCredit: {
    type: 'Text',
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Permanent credits'),
    helpEntries: ['permanentCredit', 'textFormatting'],
  },
  permanentCreditBackground: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Permanent credits background'),
    default: true,
  },
  popupContentTemplate: {
    type: 'Text',
    impacts: [], // not needed
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('Popup content template'),
    helpEntries: ['dynamicProperties', 'textFormatting'],
    placeholder: '# {name}',
    inheritable: true,
    default: '# {name}\n{description}',
  },
  popupShape: {
    type: String,
    impacts: [], // not needed
    belongsTo: ['map', 'datalayer', 'feature'], // XXX ?
    label: translate('Popup shape'),
    inheritable: true,
    choices: [
      ['Default', translate('Popup')],
      ['Large', translate('Popup (large)')],
      ['Panel', translate('Side panel')],
    ],
    default: 'Default',
  },
  popupTemplate: {
    type: String,
    impacts: [], // not needed
    belongsTo: ['map', 'datalayer', 'feature'], // XXX ?
    label: translate('Popup content style'),
    inheritable: true,
    choices: [
      ['Default', translate('Default')],
      ['Table', translate('Table')],
      ['GeoRSSImage', translate('GeoRSS (title + image)')],
      ['GeoRSSLink', translate('GeoRSS (only link)')],
      ['OSM', translate('OpenStreetMap')],
    ],
    default: 'Default',
  },
  remoteData: {
    type: Object,
    impacts: ['remote-data'],
    belongsTo: ['datalayer'],
  },
  scaleControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Do you want to display the scale control?'),
    default: true,
  },
  scrollWheelZoom: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Allow scroll wheel zoom?'),
  },
  searchControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the search control'),
    default: true,
  },
  shortCredit: {
    type: String,
    impacts: ['ui'],
    belongsTo: ['map'],
    label: translate('Short credits'),
    helpEntries: ['shortCredit', 'textFormatting'],
  },
  showLabel: {
    type: Boolean,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    nullable: true,
    label: translate('Display label'),
    inheritable: true,
    default: false,
  },
  slideshow: {
    belongsTo: ['map'],
    type: Object,
    impacts: ['ui'],
  },
  slugKey: {
    type: String,
    impacts: [],
    belongsTo: ['map', 'datalayer', 'feature'], // XXX ?
  },
  smoothFactor: {
    type: Number,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    min: 0,
    max: 10,
    step: 0.5,
    label: translate('Simplify'),
    helpEntries: 'smoothFactor',
    inheritable: true,
    default: 1.0,
  },
  sortKey: {
    type: String,
    impacts: ['datalayer-index', 'data'],
    belongsTo: ['map', 'datalayer'],
  },
  starControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the star map button'),
  },
  stroke: {
    type: Boolean,
    impacts: ['data'],
    belongsTo: ['map', 'datalayer', 'feature'],
    label: translate('stroke'),
    helpEntries: 'stroke',
    inheritable: true,
    default: true,
  },
  syncEnabled: {
    type: Boolean,
    impacts: ['sync', 'ui'],
    belongsTo: ['map'],
    label: translate('Enable real-time collaboration'),
    helpEntries: 'sync',
    default: false,
  },
  tilelayer: {
    type: Object,
    impacts: ['background'],
    belongsTo: ['map'],
  },
  tilelayersControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the tile layers control'),
  },
  toZoom: {
    type: Number,
    impacts: [], // not needed
    belongsTo: ['map'],
    label: translate('To zoom'),
    helpText: translate('Optional.'),
  },
  type: {
    type: 'String',
    impacts: ['data'],
    belongsTo: [], // XXX ?
  },
  weight: {
    type: Number,
    impacts: ['data'],
    belongsTo: ['feature'], // XXX ?,
    min: 1,
    max: 20,
    step: 1,
    label: translate('weight'),
    inheritable: true,
    default: 3,
  },
  zoom: {
    type: Number,
    impacts: [], // default zoom, doesn't need to be updated
    belongsTo: ['map'],
  },
  zoomControl: {
    type: Boolean,
    impacts: ['ui'],
    belongsTo: ['map'],
    nullable: true,
    label: translate('Display the zoom control'),
    default: true,
  },
  zoomTo: {
    type: Number,
    impacts: [], // not need to update the view
    belongsTo: ['map'],
    placeholder: translate('Inherit'),
    helpEntries: 'zoomTo',
    label: translate('Default zoom level'),
    inheritable: true,
  },
}
