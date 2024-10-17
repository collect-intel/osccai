import React from "react";

const ConstitutionableExplanation: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Constitutionable Statements</h2>
      <p className="mb-4">
        Whether a statement is considered "Constitutionable" depends on our
        consensus scoring mechanism, which attempts to determine the principles
        with the highest consensus among participants. The goal is to identify
        principles that have broad agreement within the community, making them
        suitable candidates for inclusion in a constitution.
      </p>
      <p>
        Keep in mind that this is a dynamic process. As more people participate
        and vote, the consensus scores and "Constitutionable" status of
        statements may change over time.
      </p>
    </div>
  );
};

export default ConstitutionableExplanation;
