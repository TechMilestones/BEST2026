import FloatingBall from '../../components/FloatingBall/FloatingBall'
import './VisualizationPage.css'

export default function VisualizationPage() {
  return (
    <div className='visual-page'>
      <h1 className="visual-page_title">FPV Dashboard</h1>
      <div className="visual-page_3d">
        <img src="/img2.jpg"/>
      </div>
      <div className='visual-page_row'>
        <div className='visual-page_list'>
          <div className='visual-page_list-card'>
            <h3 className='visual-page_list-card_title'>Загальна дистанція: </h3> 
            <span className='visual-page_list-card_num'>1259.10</span>
            <p className='visual-page_list-card_metric'>m</p>
          </div>

          <div className='visual-page_list-card'>
            <h3 className='visual-page_list-card_title'>Максимальна горизонтальна швидкість: </h3> 
            <span className='visual-page_list-card_num'>15.08</span>
            <p className='visual-page_list-card_metric'>m/c</p>
          </div>

          <div className='visual-page_list-card'>
            <h3 className='visual-page_list-card_title'>Максимальна вертикальна швидкість: </h3> 
            <span className='visual-page_list-card_num'>35.79</span>
            <p className='visual-page_list-card_metric'>m/c</p>
          </div>

          <div className='visual-page_list-card'>
            <h3 className='visual-page_list-card_title'>Максимальне прискорення: </h3> 
            <span className='visual-page_list-card_num'>82.91</span>
            <p className='visual-page_list-card_metric'>m/c^2</p>
          </div>

          <div className='visual-page_list-card'>
            <h3 className='visual-page_list-card_title'>Максимальний набір висоти: </h3> 
            <span className='visual-page_list-card_num'>561.46</span>
            <p className='visual-page_list-card_metric'>m</p>
          </div>

          <div className='visual-page_list-card'>
            <h3 className='visual-page_list-card_title'>Загальна тривалість польоту: </h3> 
            <span className='visual-page_list-card_num'>52.20</span>
            <p className='visual-page_list-card_metric'>c</p>
          </div>
        </div>

        <FloatingBall></FloatingBall>
      </div>
    </div>
  )
}
