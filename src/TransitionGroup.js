import React, { cloneElement, isValidElement } from 'react';

import { getChildMapping, mergeChildMappings } from './utils/ChildMapping';
import { timeoutsShape } from './utils/PropTypes';

const values = Object.values || (obj => Object.keys(obj).map(k => obj[k]));

function normalizeTimeout(timeout) {
  if (typeof timeout === 'number') return timeout;
  // transitions are always "appearing" in the context of a TransitionGroup
  return { ...timeout }
}

const propTypes = {
  component: React.PropTypes.any,
  children: React.PropTypes.node,
  appear: React.PropTypes.bool,
  enter: React.PropTypes.bool,
  exit: React.PropTypes.bool,
};

const defaultProps = {
  component: 'span',
  appear: false,
  enter: true,
  exit: true,
};

class TransitionGroup extends React.Component {
  static displayName = 'TransitionGroup';
  static childContextTypes = {
    transitionGroup: React.PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    const { appear, enter, exit } = this.props;

    // Initial children should all be entering, dependent on appear
    this.state = {
      children: getChildMapping(props.children, child => {
        const onExited = () => this.handleExited(child.key);
        return cloneElement(child, {
          in: true,
          appear,
          enter,
          exit,
          onExited,
        })
      }),
     };
  }

  getChildContext() {
    return {
       transitionGroup: { isMounting: !this.appeared }
    }
  }

  componentDidMount() {
    this.appeared = true;
  }

  componentWillReceiveProps(nextProps) {
    let prevChildMapping = this.state.children;
    let nextChildMapping = getChildMapping(nextProps.children);

    let children = mergeChildMappings(prevChildMapping, nextChildMapping);
    const { enter, exit } = nextProps;

    Object.keys(children).forEach((key) => {
      let child = children[key]

      if (!isValidElement(child)) return;

      const onExited = () => this.handleExited(key);

      const hasPrev = key in prevChildMapping;
      const hasNext = key in nextChildMapping;

      const prevChild = prevChildMapping[key];
      const isLeaving = isValidElement(prevChild) && !prevChild.props.in;

      // item is new (entering)
      if (hasNext && (!hasPrev || isLeaving)) {
        // console.log('entering', key)
        children[key] = cloneElement(child, {
          exit,
          onExited,
          in: true,
          appear: enter,
        });
      }
      // item is old (exiting)
      else if (!hasNext && hasPrev && !isLeaving) {
        // console.log('leaving', key)
        children[key] = cloneElement(child, { in: false });
      }
      // item hasn't changed transition states
      // copy over the last transition props;
      else if (hasNext && hasPrev && isValidElement(prevChild)) {
        // console.log('unchanged', key)
        children[key] = cloneElement(child, {
          onExited,
          in: prevChild.props.in,
          appear: prevChild.props.appear,
        });
      }
    })

    this.setState({ children });
  }

  handleExited = (key) => {
    let currentChildMapping = getChildMapping(this.props.children);

    if (key in currentChildMapping) return

    this.setState((state) => {
      let children = { ...state.children };
      delete children[key];
      return { children };
    });
  };


  render() {
    const { component: Component, ...props } = this.props;
    const { children } = this.state;

    delete props.appear;
    delete props.enter;
    delete props.exit;

    return (
      <Component {...props}>
        {values(children)}
      </Component>
    );
  }
}

TransitionGroup.propTypes = propTypes;
TransitionGroup.defaultProps = defaultProps;

export default TransitionGroup;
