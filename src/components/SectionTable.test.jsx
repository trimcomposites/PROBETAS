import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import SectionTable from './SectionTable'

afterEach(cleanup)

describe('SectionTable', () => {
  test('shows a top horizontal scrollbar when it contains records', () => {
    render(
      <SectionTable title="Sistema de resina" hasRecords onCreate={() => {}}>
        <table>
          <tbody>
            <tr><td>Registro</td></tr>
          </tbody>
        </table>
      </SectionTable>,
    )

    expect(screen.getByLabelText('Desplazamiento horizontal de la tabla')).toBeTruthy()
  })

  test('synchronizes the table when the top scrollbar moves', () => {
    render(
      <SectionTable title="Sistema de resina" hasRecords onCreate={() => {}}>
        <table>
          <tbody>
            <tr><td>Registro</td></tr>
          </tbody>
        </table>
      </SectionTable>,
    )

    const topScrollbar = screen.getByLabelText('Desplazamiento horizontal de la tabla')
    const tableWrap = document.querySelector('.table-wrap')
    topScrollbar.scrollLeft = 120
    fireEvent.scroll(topScrollbar)

    expect(tableWrap.scrollLeft).toBe(120)
  })
})
