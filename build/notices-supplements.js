// Notices for code that a package bundles but whose license file is not in
// the npm package. Keep in sync when upgrading @viz-js/viz.

const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

module.exports = [
  {
    title: '@viz-js/viz wrapper (MIT) - license text',
    text: `Source: https://github.com/mdaines/viz-js

The MIT License (MIT)

Copyright (c) Michael Daines

${MIT_BODY}`,
  },
  {
    title: 'Graphviz (EPL-1.0) - compiled into @viz-js/viz',
    text: `Graphviz is compiled to WebAssembly inside @viz-js/viz (lib/backend.js).

Graphviz is distributed under the Eclipse Public License - v 1.0:
https://www.eclipse.org/legal/epl-v10.html

Source code for Graphviz is available from https://graphviz.org/ and
https://gitlab.com/graphviz/graphviz . Graphviz has not been modified by
AnyRead MD.

Graphviz is provided "AS IS", WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
either express or implied. The Graphviz contributors disclaim all liability
for damages, including direct, indirect, special, incidental and
consequential damages. Any provisions in the AnyRead MD license that
differ from the Eclipse Public License are offered by the AnyRead MD
authors alone and not by any Graphviz contributor.`,
  },
  {
    title: 'Expat XML parser (MIT) - compiled into @viz-js/viz',
    text: `Source: https://github.com/libexpat/libexpat

Copyright (c) 1998-2000 Thai Open Source Software Center Ltd and Clark Cooper
Copyright (c) 2001-2025 Expat maintainers

${MIT_BODY}`,
  },
]
