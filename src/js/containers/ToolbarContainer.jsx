import { connect } from 'react-redux'
import { toggleTodo } from '../actions'
import Toolbar from '../components/Toolbar.jsx'

const mapStateToProps = (state) => {
    return {
        state: state
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        onTodoClick: (id) => {
            dispatch(toggleTodo(id))
        }
    }
}

const VisibleTodoList = connect(
    mapStateToProps,
    mapDispatchToProps
)(Toolbar)

export default VisibleTodoList
