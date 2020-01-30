
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    const seen_callbacks = new Set();
    function flush() {
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/FAQItem.svelte generated by Svelte v3.18.1 */

    const file = "src/FAQItem.svelte";

    function create_fragment(ctx) {
    	let li;
    	let h2;
    	let t0;
    	let t1;
    	let p;
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			h2 = element("h2");
    			t0 = text(/*question*/ ctx[0]);
    			t1 = space();
    			p = element("p");
    			t2 = text(/*answer*/ ctx[1]);
    			attr_dev(h2, "class", "svelte-gfcz64");
    			add_location(h2, file, 7, 2, 118);
    			add_location(p, file, 8, 2, 140);
    			attr_dev(li, "class", "svelte-gfcz64");
    			add_location(li, file, 6, 0, 111);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, h2);
    			append_dev(h2, t0);
    			append_dev(li, t1);
    			append_dev(li, p);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*question*/ 1) set_data_dev(t0, /*question*/ ctx[0]);
    			if (dirty & /*answer*/ 2) set_data_dev(t2, /*answer*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { question = "What is the question?" } = $$props;
    	let { answer = "The answer is 42." } = $$props;
    	const writable_props = ["question", "answer"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FAQItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("question" in $$props) $$invalidate(0, question = $$props.question);
    		if ("answer" in $$props) $$invalidate(1, answer = $$props.answer);
    	};

    	$$self.$capture_state = () => {
    		return { question, answer };
    	};

    	$$self.$inject_state = $$props => {
    		if ("question" in $$props) $$invalidate(0, question = $$props.question);
    		if ("answer" in $$props) $$invalidate(1, answer = $$props.answer);
    	};

    	return [question, answer];
    }

    class FAQItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { question: 0, answer: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FAQItem",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get question() {
    		throw new Error("<FAQItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set question(value) {
    		throw new Error("<FAQItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get answer() {
    		throw new Error("<FAQItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set answer(value) {
    		throw new Error("<FAQItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/FAQ.svelte generated by Svelte v3.18.1 */
    const file$1 = "src/FAQ.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (20:2) {#each $faqitems as faqitem}
    function create_each_block(ctx) {
    	let current;

    	const faqitem = new FAQItem({
    			props: {
    				question: /*faqitem*/ ctx[8].question,
    				answer: /*faqitem*/ ctx[8].answer
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(faqitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(faqitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const faqitem_changes = {};
    			if (dirty & /*$faqitems*/ 8) faqitem_changes.question = /*faqitem*/ ctx[8].question;
    			if (dirty & /*$faqitems*/ 8) faqitem_changes.answer = /*faqitem*/ ctx[8].answer;
    			faqitem.$set(faqitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(faqitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(faqitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(faqitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(20:2) {#each $faqitems as faqitem}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let ul;
    	let t0;
    	let div;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let label1;
    	let t3;
    	let input1;
    	let t4;
    	let button0;
    	let t6;
    	let button1;
    	let current;
    	let dispose;
    	let each_value = /*$faqitems*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div = element("div");
    			label0 = element("label");
    			t1 = text("Question:\n    ");
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			t3 = text("Answer:\n    ");
    			input1 = element("input");
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "add static FAQItem";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "add";
    			add_location(ul, file$1, 18, 0, 358);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$1, 27, 4, 575);
    			add_location(label0, file$1, 25, 2, 549);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$1, 31, 4, 654);
    			add_location(label1, file$1, 29, 2, 630);
    			add_location(button0, file$1, 34, 2, 764);
    			add_location(button1, file$1, 37, 2, 865);
    			add_location(div, file$1, 24, 0, 541);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, label0);
    			append_dev(label0, t1);
    			append_dev(label0, input0);
    			set_input_value(input0, /*question*/ ctx[1]);
    			append_dev(div, t2);
    			append_dev(div, label1);
    			append_dev(label1, t3);
    			append_dev(label1, input1);
    			set_input_value(input1, /*answer*/ ctx[2]);
    			append_dev(div, t4);
    			append_dev(div, button0);
    			append_dev(div, t6);
    			append_dev(div, button1);
    			current = true;

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    				listen_dev(button0, "click", /*click_handler*/ ctx[7], false, false, false),
    				listen_dev(button1, "click", /*createFAQItem*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$faqitems*/ 8) {
    				each_value = /*$faqitems*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*question*/ 2 && input0.value !== /*question*/ ctx[1]) {
    				set_input_value(input0, /*question*/ ctx[1]);
    			}

    			if (dirty & /*answer*/ 4 && input1.value !== /*answer*/ ctx[2]) {
    				set_input_value(input1, /*answer*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $faqitems,
    		$$unsubscribe_faqitems = noop,
    		$$subscribe_faqitems = () => ($$unsubscribe_faqitems(), $$unsubscribe_faqitems = subscribe(faqitems, $$value => $$invalidate(3, $faqitems = $$value)), faqitems);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_faqitems());
    	let { faqitems = [] } = $$props; // must be provided by parent
    	validate_store(faqitems, "faqitems");
    	$$subscribe_faqitems();
    	let question = "What is your question?";
    	let answer = `It's that easy: 42.`;

    	function createFAQItem(event) {
    		faqitems.create({
    			question: "abc?",
    			answer: "lkajöd lakjdf"
    		});
    	}

    	const writable_props = ["faqitems"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FAQ> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		question = this.value;
    		$$invalidate(1, question);
    	}

    	function input1_input_handler() {
    		answer = this.value;
    		$$invalidate(2, answer);
    	}

    	const click_handler = () => faqitems.create("qs", "about 42");

    	$$self.$set = $$props => {
    		if ("faqitems" in $$props) $$subscribe_faqitems($$invalidate(0, faqitems = $$props.faqitems));
    	};

    	$$self.$capture_state = () => {
    		return { faqitems, question, answer, $faqitems };
    	};

    	$$self.$inject_state = $$props => {
    		if ("faqitems" in $$props) $$subscribe_faqitems($$invalidate(0, faqitems = $$props.faqitems));
    		if ("question" in $$props) $$invalidate(1, question = $$props.question);
    		if ("answer" in $$props) $$invalidate(2, answer = $$props.answer);
    		if ("$faqitems" in $$props) faqitems.set($faqitems = $$props.$faqitems);
    	};

    	return [
    		faqitems,
    		question,
    		answer,
    		$faqitems,
    		createFAQItem,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler
    	];
    }

    class FAQ extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { faqitems: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FAQ",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get faqitems() {
    		throw new Error("<FAQ>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set faqitems(value) {
    		throw new Error("<FAQ>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const faqitems_default = [
        {
            question: 'What does the Plone Foundation do?',
            answer: `The mission of the Plone Foundation is to protect and promote Plone.
            The Foundation provides marketing assistance, awareness, and
            evangelism assistance to the Plone community. The Foundation also
            assists with development funding and coordination of funding for
            large feature implementations. In this way, our role is similar to
            the role of the Apache Software Foundation and its relationship with
            the Apache Project.`
        },
        {
            question: 'Who can join the Plone Foundation',
            answer: `Everyone contributing to Plone Software, Plone documentation, organizing events or doing something good for PF.`
        }
    ];

    function createFAQItems() {
        const {subscribe, set, update} = writable(faqitems_default);

        return {
            subscribe,
            create: faqitem => update(items => {
                console.log('create faqitem', faqitem);
                return [
                    ...items,
                    faqitem
                ]
            }),
            reset: () => set(faqitems_default)
        }
    }

    const faqitemsstore1 = createFAQItems();
    const faqitemsstore2 = createFAQItems();

    /* src/App.svelte generated by Svelte v3.18.1 */
    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let h10;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let button;
    	let t6;
    	let h11;
    	let t8;
    	let current;
    	let dispose;

    	const faq0 = new FAQ({
    			props: { faqitems: faqitemsstore1 },
    			$$inline: true
    		});

    	const faq1 = new FAQ({
    			props: { faqitems: faqitemsstore2 },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			h10 = element("h1");
    			t0 = text("FAQ for \"");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("\"");
    			t3 = space();
    			create_component(faq0.$$.fragment);
    			t4 = space();
    			button = element("button");
    			button.textContent = "add static FAQItem from App component";
    			t6 = space();
    			h11 = element("h1");
    			h11.textContent = "FAQ for \"Frameworks\"";
    			t8 = space();
    			create_component(faq1.$$.fragment);
    			attr_dev(h10, "class", "svelte-12q9x7s");
    			add_location(h10, file$2, 10, 2, 173);
    			add_location(button, file$2, 12, 2, 236);
    			attr_dev(h11, "class", "svelte-12q9x7s");
    			add_location(h11, file$2, 16, 2, 398);
    			attr_dev(main, "class", "svelte-12q9x7s");
    			add_location(main, file$2, 9, 0, 164);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h10);
    			append_dev(h10, t0);
    			append_dev(h10, t1);
    			append_dev(h10, t2);
    			append_dev(main, t3);
    			mount_component(faq0, main, null);
    			append_dev(main, t4);
    			append_dev(main, button);
    			append_dev(main, t6);
    			append_dev(main, h11);
    			append_dev(main, t8);
    			mount_component(faq1, main, null);
    			current = true;
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[1], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(faq0.$$.fragment, local);
    			transition_in(faq1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(faq0.$$.fragment, local);
    			transition_out(faq1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(faq0);
    			destroy_component(faq1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => faqitemsstore1.create({
    		question: "my static question",
    		answer: "just 42"
    	});

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	return [name, click_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'Garten'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
