import chart from './chart';

import data from '/count.csv?url';
import './style.css';

const res = await fetch(data);
const text = await res.text();
chart(text);
