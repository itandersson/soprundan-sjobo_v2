import { DomUtil } from '../../../vendors/leaflet/leaflet-src.esm.js'
import { BaseAjax, SingleMixin } from '../autocomplete.js'
import { translate } from '../i18n.js'

const BOUNDARY_TYPES = {
  admin_6: 'département',
  admin_7: 'pays (loi Voynet)',
  admin_8: 'commune',
  admin_9: 'quartier, hameau, arrondissement',
  political: 'canton',
  local_authority: 'EPCI',
}

const TEMPLATE = `
  <h3>GeoDataMine</h3>
  <select name="theme"></select>
  <label>
    <input type="checkbox" name="aspoint" />
    ${translate('Convert all geometries to points')}
  </label>
`

class Autocomplete extends SingleMixin(BaseAjax) {
  createResult(item) {
    return super.createResult({
      value: item.id,
      label: `${item.name} (${BOUNDARY_TYPES[item.type]} — ${item.ref})`,
    })
  }
}

export class Importer {
  constructor(map, options) {
    this.name = 'GeoDataMine'
    this.baseUrl = options?.url || 'https://geodatamine.fr'
  }

  async open(importer) {
    let boundary = null
    let boundaryName = null
    const container = DomUtil.create('div')
    container.innerHTML = TEMPLATE
    const response = await importer.map.request.get(`${this.baseUrl}/themes`)
    const select = container.querySelector('select')
    if (response && response.ok) {
      const { themes } = await response.json()
      for (const theme of themes) {
        DomUtil.element({
          tagName: 'option',
          value: theme.id,
          textContent: theme['name:fr'],
          parent: select,
        })
      }
    } else {
      console.error(response)
    }
    const asPoint = container.querySelector('[name=aspoint]')
    this.autocomplete = new Autocomplete(container, {
      url: `${this.baseUrl}/boundaries/search?text={q}`,
      on_select: (choice) => {
        boundary = choice.item.value
        boundaryName = choice.item.label
      },
    })
    const confirm = () => {
      importer.url = `${this.baseUrl}/data/${select.value}/${boundary}?format=geojson&aspoint=${asPoint.checked}`
      importer.format = 'geojson'
      importer.layerName = `${boundaryName} — ${select.options[select.selectedIndex].textContent}`
      importer.dialog.close()
    }
    L.DomUtil.createButton('', container, 'OK', confirm)

    importer.dialog.open({
      content: container,
      className: 'geodatamine dark',
    })
  }
}
