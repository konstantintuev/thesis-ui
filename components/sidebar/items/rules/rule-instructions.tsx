export const getBasicRuleInstructions = (): JSX.Element => (
  <div className="mx-auto max-w-4xl p-6">
    {/* Thank you, ChatGPT, for the nice text based on all the instructions, code sample, use cases and metadata I gave you! */}
    {/* Introduction */}
    <p className="mb-6 text-lg text-gray-700">
      Welcome to the rule creation system! Here, you will define rules that are
      used to rank files based on their metadata. These rules are applied to
      JSON metadata stored in the system for each file. Below, we will walk you
      through how to define the key aspects of a rule:
    </p>

    {/* Key Elements of a Rule */}
    <h2 className="mb-4 text-3xl font-semibold text-gray-900">
      Key Elements of a Rule:
    </h2>

    {/* Name Section */}
    <div className="mb-6">
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">1. Name</h3>
      <p className="mb-2 text-gray-700">
        <strong>Description:</strong> Give the rule a descriptive name that
        clearly indicates what the rule is about. For example,{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">PDF 1.7 is used</code>{" "}
        or{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">
          Manufacturer is SZKTDZ
        </code>
        .
      </p>
      <p className="text-gray-700">
        <strong>Purpose:</strong> Helps users identify the rule.
      </p>
    </div>

    {/* Weight Section */}
    <div className="mb-6">
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">2. Weight</h3>
      <p className="mb-2 text-gray-700">
        <strong>Description:</strong> Assign a weight to the rule, which
        indicates how important the rule is compared to others.
      </p>
      <p className="mb-2 text-gray-700">
        <strong>Range:</strong> Any positive number greater than 0. Higher
        numbers indicate a higher priority in ranking.
      </p>
      <p className="text-gray-700">
        <strong>Example:</strong> For instance, a weight of{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">90%</code> gives the
        rule more influence over the final score than a rule with a weight of{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">50%</code>.
      </p>
    </div>

    {/* Comparison Section */}
    <div className="mb-6">
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">
        3. Comparison (JSON Format)
      </h3>
      <p className="mb-2 text-gray-700">
        <strong>Description:</strong> This is where the actual rule logic is
        defined using JSON. Each rule can have multiple conditions that must all
        be met (AND logic).
      </p>
      <p className="mb-2 text-gray-700">
        <strong>Structure:</strong>
      </p>
      <ul className="mb-2 list-inside list-disc text-gray-700">
        <li>
          <strong>attribute:</strong> The field in the metadata to check.
        </li>
        <li>
          <strong>comparator:</strong> Defines the type of comparison.
        </li>
        <li>
          <strong>value:</strong> The value the attribute is compared to.
        </li>
      </ul>
      <p className="mb-2 text-gray-700">
        <strong>Example:</strong>
      </p>
      <pre className="mb-2 whitespace-pre-wrap break-words rounded bg-gray-100 p-4 text-sm text-gray-800">
        {"[\n" +
          "  {\n" +
          '    "attribute": "file_metadata.format",\n' +
          '    "comparator": "eq",\n' +
          '    "value": "PDF 1.7"\n' +
          "  }\n" +
          "]"}
      </pre>
    </div>

    {/* Comparators Section */}
    <div className="mb-6">
      <h2 className="mb-4 text-3xl font-semibold text-gray-900">
        List of Available Comparators:
      </h2>
      <ul className="list-inside list-disc space-y-2 text-gray-700">
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">eq</code>: Checks if
          a field equals a certain value.
          <br />
          Example: <code>format = &quot;PDF 1.7&quot;</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">ne</code>: Checks if
          a field does *not* equal a certain value.
          <br />
          Example: <code>format != &quot;PDF 1.7&quot;</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">gt</code>: Checks if
          a field is greater than a value (works with numbers).
          <br />
          Example: <code>numPages &gt; 50</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">gte</code>: Checks
          if a field is greater than or equal to a value.
          <br />
          Example: <code>avgWordsPerPage &gt;= 530</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">lt</code>: Checks if
          a field is less than a value.
          <br />
          Example: <code>numPages &lt; 100</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">lte</code>: Checks
          if a field is less than or equal to a value.
          <br />
          Example: <code>numPages &lt;= 50</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">contain</code>:
          Checks if a field contains a certain string (case insensitive).
          <br />
          Example: <code>fileName contains &quot;MTN&quot;</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">not_contain</code>:
          Checks if a field does not contain a certain string.
          <br />
          Example: <code>fileName does not contain &quot;MTN&quot;</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">like</code>: Checks
          if a field matches a string with wildcard support.
          <br />
          Example: <code>fileName like &quot;%2024%&quot;</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">regex_match</code>:
          Checks if a field matches a regular expression.
          <br />
          Example: <code>display_features matches &quot;speed|kmh&quot;</code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">
            not_regex_match
          </code>
          : Checks if a field does not match a given regular expression.
          <br />
          Example:{" "}
          <code>
            file_name does not match the pattern {`"^invoice.*2024$"`}
          </code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">in</code>: Checks if
          a field is within a list of comma-separated values.
          <br />
          Example:{" "}
          <code>
            manufacturer is in [&quot;SZKTDZ&quot;, &quot;ABC Corp&quot;]
          </code>
        </li>
        <li>
          <code className="rounded bg-gray-100 px-1 py-0.5">nin</code>: Checks
          if a field&apos;s value is not within a list of comma-separated
          values.
          <br />
          Example:{" "}
          <code>
            manufacturer is in [&quot;SZKTDZ&quot;, &quot;ABC Corp&quot;]
          </code>
        </li>
      </ul>
    </div>

    {/* Simple Rule Example Section */}
    <div className="mb-6">
      <h2 className="mb-4 text-3xl font-semibold text-gray-900">
        Example of a Rule:
      </h2>
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">Name:</h3>
      <p className="mb-2 text-gray-700">
        <code className="rounded bg-gray-100 px-1 py-0.5">PDF 1.7 is used</code>
      </p>
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">Weight:</h3>
      <p className="mb-2 text-gray-700">
        <code className="rounded bg-gray-100 px-1 py-0.5">80%</code>
      </p>
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">
        Comparison JSON:
      </h3>
      <pre className="whitespace-pre-wrap break-words rounded bg-gray-100 p-4 text-sm text-gray-800">
        {"[\n" +
          "  {\n" +
          '    "attribute": "file_metadata.format",\n' +
          '    "comparator": "eq",\n' +
          '    "value": "PDF 1.7"\n' +
          "  }\n" +
          "]"}
      </pre>
      <p className="text-gray-700">
        <strong>Explanation:</strong> This rule checks if the file&apos;s format
        is exactly{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">PDF 1.7</code> and
        gives it a weight of{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">80%</code> in the
        final score.
      </p>
    </div>

    {/* Complex Rule Example Section */}
    <div className="mb-6">
      <h2 className="mb-4 text-3xl font-semibold text-gray-900">
        More Complex Rule Example:
      </h2>
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">Name:</h3>
      <p className="mb-2 text-gray-700">
        <code className="rounded bg-gray-100 px-1 py-0.5">
          Display features contain battery indicator and speedometer
        </code>
      </p>
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">Weight:</h3>
      <p className="mb-2 text-gray-700">
        <code className="rounded bg-gray-100 px-1 py-0.5">75%</code>
      </p>
      <h3 className="mb-2 text-2xl font-semibold text-gray-800">
        Comparison JSON:
      </h3>
      <pre className="whitespace-pre-wrap break-words rounded bg-gray-100 p-4 text-sm text-gray-800">
        {"[\n" +
          "  {\n" +
          '    "attribute": "semantic_metadata.display_features",\n' +
          '    "comparator": "contain",\n' +
          '    "value": "battery"\n' +
          "  },\n" +
          "  {\n" +
          '    "attribute": "semantic_metadata.display_features",\n' +
          '    "comparator": "regex_match",\n' +
          '    "value": "speed|kmh"\n' +
          "  }\n" +
          "]"}
      </pre>
      <p className="text-gray-700">
        <strong>Explanation:</strong> This rule checks that the display features
        in the metadata contain the word{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">battery</code> and a
        speed-related term (matching{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">speed</code> or{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">kmh</code>). Both
        conditions must be true for the rule to apply, and it has a weight of{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">75%</code>.
      </p>
    </div>

    {/* Experimental Functionality Section */}
    <div className="mb-6">
      <h2 className="mb-4 text-3xl font-semibold text-gray-900">
        Experimental Feature: Dynamic Rule Generation
      </h2>
      <p className="mb-2 text-gray-700">
        In addition to manually defining rules, we have an experimental feature
        that automatically generates rules based on the most recent metadata of
        files and an unstructured user query.
      </p>
      <p className="mb-2 text-gray-700">
        <strong>How it works:</strong> You can input an unstructured query,
        click &quot;Generate Rule JSON from Plain Text&quot;, and the system
        will attempt to infer relevant metadata keys and apply appropriate
        comparators based on the data.
      </p>
      <p className="mb-2 text-gray-700">
        <strong>Example:</strong> If you input{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">
          &quot;Files created after 2020 with more than 50 pages&quot;
        </code>
        , the system will automatically generate a rule that checks the{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">
          file_metadata.creationDate
        </code>{" "}
        and{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">
          file_metadata.numPages
        </code>{" "}
        attributes.
      </p>
      <p className="text-gray-700">
        This feature is still under development, so its accuracy may vary
        depending on the complexity of the query.
      </p>
    </div>

    {/* Important Notes Section */}
    <div>
      <h2 className="mb-4 text-3xl font-semibold text-gray-900">
        Important Notes:
      </h2>
      <ul className="list-inside list-disc space-y-2 text-gray-700">
        <li>
          <strong>Multiple Conditions:</strong> If a rule contains multiple
          conditions, they are connected with a logical <strong>AND</strong>.
          All conditions must be true for the rule to apply.
        </li>
        <li>
          <strong>Precision:</strong> Ensure that JSON is well-formed and uses
          the correct data types for numbers, strings, or arrays.
        </li>
      </ul>
    </div>
  </div>
)
